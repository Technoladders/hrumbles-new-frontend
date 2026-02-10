// src/services/sales/apolloCompanySearch.ts
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

export interface ApolloOrganization {
  id: string;
  name: string;
  website_url?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  facebook_url?: string | null;
  primary_phone?: { number?: string; source?: string; sanitized_number?: string } | null;
  phone?: string | null;
  industry?: string | null;
  industry_tag_id?: string | null;
  industry_tag_hash?: Record<string, string> | null;
  estimated_num_employees?: number | null;
  annual_revenue?: number | null;
  annual_revenue_printed?: string | null;
  organization_revenue?: number | null;
  organization_revenue_printed?: string | null;
  logo_url?: string | null;
  primary_domain?: string | null;
  founded_year?: number | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  short_description?: string | null;
  seo_description?: string | null;
  raw_address?: string | null;
  street_address?: string | null;
  postal_code?: string | null;
  sic_codes?: string[] | null;
  naics_codes?: string[] | null;
  time_zone?: string | null;
  alexa_ranking?: number | null;
  publicly_traded_symbol?: string | null;
  publicly_traded_exchange?: string | null;
  industries?: string[] | null;
  secondary_industries?: string[] | null;
  keywords?: string[] | null;
  languages?: string[] | null;
  total_funding?: number | null;
  total_funding_printed?: string | null;
  latest_funding_round_date?: string | null;
  latest_funding_stage?: string | null;
  funding_events?: FundingEvent[] | null;
  technology_names?: string[] | null;
  current_technologies?: Technology[] | null;
  departmental_head_count?: Record<string, number> | null;
  employee_metrics?: EmployeeMetric[] | null;
  crunchbase_url?: string | null;
  blog_url?: string | null;
  angellist_url?: string | null;
  owned_by_organization_id?: string | null;
  owned_by_organization?: { id: string; name: string; website_url?: string } | null;
  suborganizations?: Suborganization[] | null;
  num_suborganizations?: number | null;
  retail_location_count?: number | null;
}

export interface FundingEvent {
  id: string;
  date?: string | null;
  type?: string | null;
  funding_type?: string | null;
  investors?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  announced_date?: string | null;
  news_url?: string | null;
}

export interface Technology {
  uid: string;
  name: string;
  category?: string | null;
}

export interface Suborganization {
  id: string;
  name: string;
  website_url?: string | null;
}

export interface EmployeeMetric {
  start_date: string;
  departments: DepartmentMetric[];
}

export interface DepartmentMetric {
  functions: string | null;
  new: number;
  retained: number;
  churned: number;
}

export interface ApolloCompanySearchFilters {
  q_organization_name?: string;
  q_organization_keyword_tags?: string[];
  organization_industry_tag_ids?: string[];
  organization_industries?: string[];
  organization_locations?: string[];
  organization_not_locations?: string[];
  organization_num_employees_ranges?: string[] | Array<{ min?: number; max?: number }>;
  revenue_range?: { min?: number | null; max?: number | null };
  currently_using_any_of_technology_uids?: string[];
  organization_latest_funding_stage_cd?: string[];
  organization_founded_year_min?: number;
  organization_founded_year_max?: number;
  organization_founded_year_range?: { min?: number | null; max?: number | null };
}

export interface ApolloSearchResponse {
  organizations: ApolloOrganization[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

export interface SaveResultsResponse {
  savedToEnrichment: number;
  savedToCompanies: number;
  errors: string[];
}

// ============================================================================
// HELPER: Get current user and organization
// ============================================================================

async function getCurrentUserAndOrg(): Promise<{ userId: string | null; organizationId: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { userId: null, organizationId: null };

    const { data: profile } = await supabase
      .from('hr_employees')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    return {
      userId: user.id,
      organizationId: profile?.organization_id || null
    };
  } catch {
    return { userId: null, organizationId: null };
  }
}

// ============================================================================
// SEARCH COMPANIES (No Credits)
// ============================================================================

export async function searchCompaniesInApollo(
  filters: ApolloCompanySearchFilters,
  page: number = 1,
  perPage: number = 100
): Promise<ApolloSearchResponse> {
  try {
    console.log("[Apollo Search] Searching with filters:", filters);

    const { userId, organizationId } = await getCurrentUserAndOrg();

    const { data, error } = await supabase.functions.invoke("apollo-company-search-v1", {
      body: {
        filters: filters,
        page,
        per_page: perPage,
        organization_id: organizationId,
        user_id: userId,
      },
    });

    if (error) {
      console.error("[Apollo Search] Edge function error:", error);
      throw new Error(error.message || "Failed to search companies");
    }

    if (data?.error) {
      console.error("[Apollo Search] API error:", data.error);
      throw new Error(data.error);
    }

    console.log(`[Apollo Search] Found ${data?.organizations?.length || 0} companies`);

    return {
      organizations: data?.organizations || [],
      pagination: data?.pagination || {
        page: 1,
        per_page: perPage,
        total_entries: 0,
        total_pages: 0,
      },
    };
  } catch (error: any) {
    console.error("[Apollo Search] Error:", error);
    throw error;
  }
}

// ============================================================================
// SAVE ALL SEARCH RESULTS TO DATABASE
// ============================================================================

export async function saveAllSearchResultsToDatabase(
  organizations: ApolloOrganization[],
  organizationId: string,
  userId: string | null,
  fileId?: string | null
): Promise<SaveResultsResponse> {
  const results: SaveResultsResponse = {
    savedToEnrichment: 0,
    savedToCompanies: 0,
    errors: [],
  };

  for (const org of organizations) {
    try {
      // 1. Save to enrichment_organizations
      const enrichmentData = {
        apollo_org_id: org.id,
        name: org.name,
        website_url: org.website_url,
        linkedin_url: org.linkedin_url,
        twitter_url: org.twitter_url,
        facebook_url: org.facebook_url,
        primary_phone: org.primary_phone?.number || org.phone || null,
        industry: org.industry,
        industry_tag_id: org.industry_tag_id,
        estimated_num_employees: org.estimated_num_employees,
        annual_revenue: org.annual_revenue || org.organization_revenue,
        annual_revenue_printed: org.annual_revenue_printed || org.organization_revenue_printed,
        logo_url: org.logo_url,
        primary_domain: org.primary_domain,
        founded_year: org.founded_year,
        city: org.city,
        state: org.state,
        country: org.country,
        short_description: org.short_description,
        seo_description: org.seo_description,
        raw_address: org.raw_address,
        street_address: org.street_address,
        postal_code: org.postal_code,
        sic_codes: org.sic_codes,
        naics_codes: org.naics_codes,
        time_zone: org.time_zone,
        alexa_ranking: org.alexa_ranking,
        publicly_traded_symbol: org.publicly_traded_symbol,
        publicly_traded_exchange: org.publicly_traded_exchange,
        secondary_industries: org.secondary_industries,
        total_funding: org.total_funding,
        total_funding_printed: org.total_funding_printed,
        latest_funding_stage: org.latest_funding_stage,
        latest_funding_round_date: org.latest_funding_round_date,
        crunchbase_url: org.crunchbase_url,
        organization_id: organizationId,
        languages: org.languages,
        industries: org.industries,
        owned_by_organization_id: org.owned_by_organization_id,
        num_suborganizations: org.num_suborganizations || org.suborganizations?.length || 0,
      };

      const { error: enrichError } = await supabase
        .from("enrichment_organizations")
        .upsert(enrichmentData, { onConflict: "apollo_org_id" });

      if (enrichError) {
        console.error(`[Save] Enrichment error for ${org.name}:`, enrichError);
      } else {
        results.savedToEnrichment++;
      }

      // 2. Save to companies table
      const location = [org.city, org.state, org.country].filter(Boolean).join(", ");

      const companyData: Record<string, any> = {
        name: org.name,
        domain: org.primary_domain,
        website: org.website_url,
        linkedin: org.linkedin_url,
        twitter: org.twitter_url,
        facebook: org.facebook_url,
        logo_url: org.logo_url,
        industry: org.industry,
        employee_count: org.estimated_num_employees,
        revenue: org.annual_revenue_printed || org.organization_revenue_printed || (org.annual_revenue ? String(org.annual_revenue) : null),
        location: location || null,
        city: org.city,
        state: org.state,
        country: org.country,
        address: org.raw_address || org.street_address,
        about: org.short_description || org.seo_description,
        description: org.short_description || org.seo_description,
        start_date: org.founded_year ? String(org.founded_year) : null,
        founded_year: org.founded_year,
        phone: org.primary_phone?.number || org.phone || null,
        apollo_org_id: org.id,
        organization_id: organizationId,
        created_by: userId,
        updated_by: userId,
        stage: "Intelligence",
        status: "Intelligence",
        intelligence_last_synced: new Date().toISOString(),
        company_data: {
          keywords: org.keywords,
          technologies: org.technology_names,
          current_technologies: org.current_technologies,
          funding_stage: org.latest_funding_stage,
          total_funding: org.total_funding_printed,
          departmental_headcount: org.departmental_head_count,
          employee_metrics: org.employee_metrics,
          industries: org.industries,
          secondary_industries: org.secondary_industries,
          sic_codes: org.sic_codes,
          naics_codes: org.naics_codes,
          languages: org.languages,
          publicly_traded_symbol: org.publicly_traded_symbol,
          publicly_traded_exchange: org.publicly_traded_exchange,
          owned_by: org.owned_by_organization,
          suborganizations: org.suborganizations,
          funding_events: org.funding_events,
        },
      };

      if (fileId) {
        companyData.file_id = fileId;
      }

      const { data: existingByApollo } = await supabase
        .from("companies")
        .select("id, status")
        .eq("apollo_org_id", org.id)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (existingByApollo) {
        const updateData = { ...companyData };
        if (existingByApollo.status === "Active") {
          delete updateData.status;
          delete updateData.stage;
        }
        delete updateData.created_by;
        updateData.updated_at = new Date().toISOString();

        const { error: updateError } = await supabase
          .from("companies")
          .update(updateData)
          .eq("id", existingByApollo.id);

        if (updateError) {
          console.error(`[Save] Company update error for ${org.name}:`, updateError);
          results.errors.push(`${org.name}: ${updateError.message}`);
        } else {
          results.savedToCompanies++;
        }
      } else {
        const { data: existingByDomain } = await supabase
          .from("companies")
          .select("id, status")
          .eq("domain", org.primary_domain)
          .eq("organization_id", organizationId)
          .maybeSingle();

        if (existingByDomain) {
          const updateData = { ...companyData };
          if (existingByDomain.status === "Active") {
            delete updateData.status;
            delete updateData.stage;
          }
          delete updateData.created_by;
          updateData.updated_at = new Date().toISOString();

          const { error: updateError } = await supabase
            .from("companies")
            .update(updateData)
            .eq("id", existingByDomain.id);

          if (updateError) {
            console.error(`[Save] Company domain update error for ${org.name}:`, updateError);
            results.errors.push(`${org.name}: ${updateError.message}`);
          } else {
            results.savedToCompanies++;
          }
        } else {
          const { error: insertError } = await supabase
            .from("companies")
            .insert(companyData);

          if (insertError) {
            console.error(`[Save] Company insert error for ${org.name}:`, insertError);
            results.errors.push(`${org.name}: ${insertError.message}`);
          } else {
            results.savedToCompanies++;
          }
        }
      }

      // 3. Save keywords (with proper error handling)
      if (org.keywords && org.keywords.length > 0) {
        const keywordsToInsert = org.keywords.map((keyword) => ({
          apollo_org_id: org.id,
          keyword,
        }));

        const { error: keywordsError } = await supabase
          .from("enrichment_org_keywords")
          .upsert(keywordsToInsert, { onConflict: "apollo_org_id,keyword" });
        
        if (keywordsError) {
          console.warn(`[Save] Keywords error for ${org.id}:`, keywordsError);
        }
      }

      // 4. Save technologies (with proper error handling)
      if (org.current_technologies && org.current_technologies.length > 0) {
        const techsToInsert = org.current_technologies.map((tech) => ({
          apollo_org_id: org.id,
          uid: tech.uid,
          name: tech.name,
          category: tech.category,
        }));

        const { error: techError } = await supabase
          .from("enrichment_org_technologies")
          .upsert(techsToInsert, { onConflict: "apollo_org_id,uid" });
        
        if (techError) {
          console.warn(`[Save] Technologies error for ${org.id}:`, techError);
        }
      } else if (org.technology_names && org.technology_names.length > 0) {
        const techsToInsert = org.technology_names.map((tech, idx) => ({
          apollo_org_id: org.id,
          uid: `${org.id}_tech_${idx}`,
          name: tech,
          category: null,
        }));

        const { error: techError } = await supabase
          .from("enrichment_org_technologies")
          .upsert(techsToInsert, { onConflict: "apollo_org_id,uid" });
        
        if (techError) {
          console.warn(`[Save] Technologies error for ${org.id}:`, techError);
        }
      }

      // 5. Save funding events (with proper error handling)
      if (org.funding_events && org.funding_events.length > 0) {
        const fundingToInsert = org.funding_events.map((event) => ({
          id: event.id,
          apollo_org_id: org.id,
          date: event.date || event.announced_date,
          type: event.type || event.funding_type,
          investors: event.investors,
          amount: typeof event.amount === 'string' ? event.amount : String(event.amount || ''),
          currency: event.currency,
          news_url: event.news_url,
        }));

        const { error: fundingError } = await supabase
          .from("enrichment_org_funding_events")
          .upsert(fundingToInsert, { onConflict: "id" });
        
        if (fundingError) {
          console.warn(`[Save] Funding error for ${org.id}:`, fundingError);
        }
      }

      // 6. Save departmental headcount (with proper error handling)
      if (org.departmental_head_count) {
        const deptsToInsert = Object.entries(org.departmental_head_count).map(
          ([dept, count]) => ({
            apollo_org_id: org.id,
            department_name: dept,
            head_count: count,
          })
        );

        const { error: deptError } = await supabase
          .from("enrichment_org_departments")
          .upsert(deptsToInsert, { onConflict: "apollo_org_id,department_name" });
        
        if (deptError) {
          console.warn(`[Save] Departments error for ${org.id}:`, deptError);
        }
      }

    } catch (err: any) {
      console.error(`[Save] Exception for org ${org.name}:`, err);
      results.errors.push(`${org.name}: ${err.message}`);
    }
  }

  console.log(
    `[Save Results] Saved ${results.savedToEnrichment} to enrichment, ${results.savedToCompanies} to companies`
  );
  return results;
}

// ============================================================================
// PROMOTE TO ACTIVE CRM
// ============================================================================

export async function promoteToActiveCRM(companyId: number): Promise<any> {
  try {
    console.log(`[Promote] Promoting company ${companyId} to Active CRM`);

    const { data, error } = await supabase
      .from("companies")
      .update({
        status: "Active",
        stage: "Targeting",
        updated_at: new Date().toISOString(),
      })
      .eq("id", companyId)
      .select()
      .single();

    if (error) {
      console.error("[Promote] Error:", error);
      throw new Error(error.message || "Failed to promote company");
    }

    console.log(`[Promote] Successfully promoted ${data.name}`);
    return data;
  } catch (error: any) {
    console.error("[Promote] Error:", error);
    throw error;
  }
}

export async function bulkPromoteToActiveCRM(
  companyIds: number[]
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const id of companyIds) {
    try {
      await promoteToActiveCRM(id);
      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed };
}

// ============================================================================
// ENRICH ORGANIZATION (Uses Credits)
// ============================================================================

export async function enrichOrganization(
  domain: string,
  apolloOrgId?: string
): Promise<ApolloOrganization> {
  try {
    console.log(`[Enrich] Enriching organization with domain: ${domain}`);

    const { userId, organizationId } = await getCurrentUserAndOrg();

    const { data, error } = await supabase.functions.invoke("apollo-company-enrich", {
      body: {
        domain: domain.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0],
        company_id: apolloOrgId,
        organization_id: organizationId,
        user_id: userId,
      },
    });

    if (error) {
      console.error("[Enrich] Edge function error:", error);
      throw new Error(error.message || "Failed to enrich organization");
    }

    if (data?.error) {
      console.error("[Enrich] API error:", data.error);
      throw new Error(data.error);
    }

    // Save to database
    if (organizationId && (data?.id || apolloOrgId)) {
      await saveAllSearchResultsToDatabase([data], organizationId, userId);
    }

    console.log(`[Enrich] Successfully enriched: ${data.name}`);
    return data;
  } catch (error: any) {
    console.error("[Enrich] Error:", error);
    throw error;
  }
}

// ============================================================================
// GET COMPLETE ORGANIZATION INFO
// ============================================================================

export async function getCompleteOrganizationInfo(
  apolloOrgId: string
): Promise<ApolloOrganization> {
  try {
    console.log(`[Get Info] Fetching complete info for: ${apolloOrgId}`);

    const { userId, organizationId } = await getCurrentUserAndOrg();

    const { data, error } = await supabase.functions.invoke("apollo-organization-info", {
      body: { 
        organization_id: apolloOrgId,
        org_id: organizationId,
        user_id: userId,
      },
    });

    if (error) {
      console.error("[Get Info] Edge function error:", error);
      throw new Error(error.message || "Failed to get organization info");
    }

    if (data?.error) {
      console.error("[Get Info] API error:", data.error);
      throw new Error(data.error);
    }

    const org = data?.organization || data;

    // Save to database using the unified function
    if (organizationId) {
      await saveAllSearchResultsToDatabase([org], organizationId, userId);
    }

    console.log(`[Get Info] Successfully fetched info for: ${org.name}`);
    return org;
  } catch (error: any) {
    console.error("[Get Info] Error:", error);
    throw error;
  }
}

// ============================================================================
// GET API LOGS
// ============================================================================

export async function getApolloApiLogs(options?: {
  functionName?: string;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}): Promise<any[]> {
  try {
    const { organizationId } = await getCurrentUserAndOrg();
    
    if (!organizationId) {
      throw new Error("No organization found");
    }

    let query = supabase
      .from("apollo_api_logs")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (options?.functionName) {
      query = query.eq("function_name", options.functionName);
    }

    if (options?.startDate) {
      query = query.gte("created_at", options.startDate.toISOString());
    }

    if (options?.endDate) {
      query = query.lte("created_at", options.endDate.toISOString());
    }

    query = query.limit(options?.limit || 100);

    const { data, error } = await query;

    if (error) {
      console.error("[Get API Logs] Error:", error);
      throw error;
    }

    return data || [];
  } catch (error: any) {
    console.error("[Get API Logs] Error:", error);
    throw error;
  }
}

export async function getApolloApiLogById(logId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from("apollo_api_logs")
      .select("*")
      .eq("id", logId)
      .single();

    if (error) {
      console.error("[Get API Log] Error:", error);
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error("[Get API Log] Error:", error);
    throw error;
  }
}

// ============================================================================
// WORKSPACE FILE FUNCTIONS
// ============================================================================

export async function addCompanyToWorkspaceFile(
  companyId: number,
  fileId: string,
  userId: string | null
): Promise<void> {
  try {
    const { error } = await supabase.from("company_workspace_files").upsert(
      {
        company_id: companyId,
        file_id: fileId,
        added_by: userId,
      },
      { onConflict: "company_id,file_id" }
    );

    if (error && !error.message?.includes("duplicate")) {
      throw error;
    }
  } catch (error: any) {
    console.error("[Add to List] Error:", error);
    throw error;
  }
}

export async function bulkAddCompaniesToWorkspaceFile(
  companyIds: number[],
  fileId: string,
  userId: string | null
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const companyId of companyIds) {
    try {
      await addCompanyToWorkspaceFile(companyId, fileId, userId);
      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed };
}

// ============================================================================
// GET COMPANY BY ID
// ============================================================================

export async function getCompanyById(companyId: number): Promise<any> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();

  if (error) {
    throw new Error(error.message || "Failed to get company");
  }

  if (data?.apollo_org_id) {
    const [keywordsResult, techsResult, fundingResult, deptsResult] = await Promise.all([
      supabase
        .from("enrichment_org_keywords")
        .select("keyword")
        .eq("apollo_org_id", data.apollo_org_id),
      supabase
        .from("enrichment_org_technologies")
        .select("*")
        .eq("apollo_org_id", data.apollo_org_id),
      supabase
        .from("enrichment_org_funding_events")
        .select("*")
        .eq("apollo_org_id", data.apollo_org_id),
      supabase
        .from("enrichment_org_departments")
        .select("*")
        .eq("apollo_org_id", data.apollo_org_id),
    ]);

    return {
      ...data,
      keywords: keywordsResult.data?.map((k) => k.keyword) || [],
      technologies: techsResult.data || [],
      funding_events: fundingResult.data || [],
      departments: deptsResult.data || [],
    };
  }

  return data;
}

// ============================================================================
// GET STORED INTELLIGENCE
// ============================================================================

export async function getStoredIntelligence(apolloOrgId: string): Promise<any> {
  try {
    const [orgResult, keywordsResult, techsResult, fundingResult, deptsResult] =
      await Promise.all([
        supabase
          .from("enrichment_organizations")
          .select("*")
          .eq("apollo_org_id", apolloOrgId)
          .single(),
        supabase
          .from("enrichment_org_keywords")
          .select("keyword")
          .eq("apollo_org_id", apolloOrgId),
        supabase
          .from("enrichment_org_technologies")
          .select("*")
          .eq("apollo_org_id", apolloOrgId),
        supabase
          .from("enrichment_org_funding_events")
          .select("*")
          .eq("apollo_org_id", apolloOrgId),
        supabase
          .from("enrichment_org_departments")
          .select("*")
          .eq("apollo_org_id", apolloOrgId),
      ]);

    if (orgResult.error) throw orgResult.error;

    return {
      ...orgResult.data,
      keywords: keywordsResult.data?.map((k) => k.keyword) || [],
      technologies: techsResult.data || [],
      funding_events: fundingResult.data || [],
      departments: deptsResult.data || [],
    };
  } catch (error) {
    console.error("[Get Stored Intelligence] Error:", error);
    return null;
  }
}

// ============================================================================
// EXPORT TO CSV
// ============================================================================

export function exportCompaniesToCSV(companies: any[]): string {
  const headers = [
    "Name",
    "Domain",
    "Industry",
    "Location",
    "Employees",
    "Revenue",
    "Founded Year",
    "Website",
    "LinkedIn",
    "Phone",
    "Status",
    "Stage",
  ];

  const rows = companies.map((c) => [
    c.name || "",
    c.domain || "",
    c.industry || "",
    c.location || "",
    c.employee_count || "",
    c.revenue || "",
    c.founded_year || c.start_date || "",
    c.website || "",
    c.linkedin || "",
    c.phone || "",
    c.status || "",
    c.stage || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  return csvContent;
}

// ============================================================================
// LEGACY EXPORTS
// ============================================================================

export const saveSearchResultsToDatabase = saveAllSearchResultsToDatabase;

export async function addCompanyToCRM(
  org: ApolloOrganization,
  organizationId: string,
  userId: string | null,
  fileId?: string | null
): Promise<any> {
  await saveAllSearchResultsToDatabase([org], organizationId, userId, fileId);

  const { data } = await supabase
    .from("companies")
    .select("*")
    .eq("apollo_org_id", org.id)
    .eq("organization_id", organizationId)
    .single();

  if (data) {
    return promoteToActiveCRM(data.id);
  }

  return data;
}