// src/services/sales/apolloCompanySearch.ts
// Updated to use V2 edge function with server-side storage
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

export interface PrimaryPhone {
  number?: string;
  source?: string;
  sanitized_number?: string;
}

export interface OwnedByOrganization {
  id: string;
  name: string;
  website_url?: string | null;
}

export interface ApolloLocation {
  id?: string;
  city?: string;
  state?: string;
  country?: string;
  street_address?: string;
  raw_address?: string;
  postal_code?: string;
  is_primary?: boolean;
}

export interface ApolloOrganization {
  id: string;
  name: string;
  website_url?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  facebook_url?: string | null;
  blog_url?: string | null;
  angellist_url?: string | null;
  crunchbase_url?: string | null;
  primary_phone?: PrimaryPhone | null;
  phone?: string | null;
  sanitized_phone?: string | null;
  industry?: string | null;
  industry_tag_id?: string | null;
  industries?: string[] | null;
  secondary_industries?: string[] | null;
  sic_codes?: string[] | null;
  naics_codes?: string[] | null;
  estimated_num_employees?: number | null;
  annual_revenue?: number | null;
  annual_revenue_printed?: string | null;
  organization_revenue?: number | null;
  organization_revenue_printed?: string | null;
  market_cap?: string | null;
  publicly_traded_symbol?: string | null;
  publicly_traded_exchange?: string | null;
  logo_url?: string | null;
  primary_domain?: string | null;
  domain?: string | null;
  founded_year?: number | null;
  languages?: string[] | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  raw_address?: string | null;
  street_address?: string | null;
  postal_code?: string | null;
  locations?: ApolloLocation[];
  short_description?: string | null;
  seo_description?: string | null;
  alexa_ranking?: number | null;
  time_zone?: string | null;
  retail_location_count?: number | null;
  organization_headcount_six_month_growth?: number | null;
  organization_headcount_twelve_month_growth?: number | null;
  organization_headcount_twenty_four_month_growth?: number | null;
  total_funding?: number | null;
  total_funding_printed?: string | null;
  latest_funding_round_date?: string | null;
  latest_funding_stage?: string | null;
  funding_events?: FundingEvent[] | null;
  owned_by_organization_id?: string | null;
  owned_by_organization?: OwnedByOrganization | null;
  suborganizations?: Suborganization[] | null;
  num_suborganizations?: number | null;
  keywords?: string[] | null;
  technology_names?: string[] | null;
  current_technologies?: Technology[] | null;
  departmental_head_count?: Record<string, number> | null;
  employee_metrics?: EmployeeMetric[] | null;
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

export interface ApolloSearchResponseV2 {
  companies: any[];
  organizations: ApolloOrganization[];
  pagination: { page: number; per_page: number; total_entries: number; total_pages: number };
  saved: { enrichment: number; companies: number; errors?: string[] };
}

export interface ApolloSearchResponse {
  organizations: ApolloOrganization[];
  accounts?: ApolloOrganization[];
  pagination: { page: number; per_page: number; total_entries: number; total_pages: number };
  [key: string]: any;
}

export interface SaveResultsResponse {
  savedToEnrichment: number;
  savedToCompanies: number;
  errors: string[];
}

// ============================================================================
// HELPERS
// ============================================================================

async function getCurrentUserAndOrg(): Promise<{ userId: string | null; organizationId: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { userId: null, organizationId: null };
    const { data: profile } = await supabase.from('hr_employees').select('organization_id').eq('id', user.id).single();
    return { userId: user.id, organizationId: profile?.organization_id || null };
  } catch { return { userId: null, organizationId: null }; }
}

function extractCountryCodeFromPhone(sanitizedPhone: string | null): string | null {
  if (!sanitizedPhone) return null;
  const map: Record<string, string> = {
    '+1': 'US', '+44': 'GB', '+91': 'IN', '+55': 'BR', '+49': 'DE',
    '+33': 'FR', '+34': 'ES', '+39': 'IT', '+81': 'JP', '+86': 'CN',
    '+61': 'AU', '+65': 'SG', '+971': 'AE', '+27': 'ZA', '+60': 'MY',
    '+52': 'MX', '+41': 'CH', '+20': 'EG', '+90': 'TR', '+420': 'CZ',
  };
  for (const [prefix, code] of Object.entries(map)) {
    if (sanitizedPhone.startsWith(prefix)) return code;
  }
  return null;
}

// ============================================================================
// V2: SEARCH COMPANIES (Server-side storage)
// ============================================================================

export async function searchCompaniesInApolloV2(
  filters: ApolloCompanySearchFilters,
  page: number = 1,
  perPage: number = 100,
  fileId?: string | null
): Promise<ApolloSearchResponseV2> {
  console.log("[Apollo Search V2] Searching with filters:", filters);
  const { userId, organizationId } = await getCurrentUserAndOrg();
  if (!organizationId) throw new Error("No organization found. Please log in.");

  const { data, error } = await supabase.functions.invoke("apollo-company-search-v2", {
    body: { filters, page, per_page: perPage, organization_id: organizationId, user_id: userId, file_id: fileId },
  });

  if (error) throw new Error(error.message || "Failed to search companies");
  if (data?.error) throw new Error(data.error);

  console.log(`[Apollo Search V2] Saved: ${data.saved?.companies || 0} companies, ${data.saved?.enrichment || 0} enrichment`);

  return {
    companies: data.companies || [],
    organizations: data.organizations || [],
    pagination: data.pagination || { page: 1, per_page: perPage, total_entries: 0, total_pages: 0 },
    saved: data.saved || { enrichment: 0, companies: 0 },
  };
}

// ============================================================================
// LEGACY: SEARCH COMPANIES (backward compatibility)
// ============================================================================

export async function searchCompaniesInApollo(
  filters: ApolloCompanySearchFilters,
  page: number = 1,
  perPage: number = 100
): Promise<ApolloSearchResponse> {
  const { organizationId } = await getCurrentUserAndOrg();
  if (!organizationId) throw new Error("No organization found");
  const result = await searchCompaniesInApolloV2(filters, page, perPage);
  return { organizations: result.organizations, pagination: result.pagination };
}

// ============================================================================
// SAVE RESULTS TO DATABASE (for manual saves / backward compatibility)
// ============================================================================

export async function saveAllSearchResultsToDatabase(
  organizations: ApolloOrganization[],
  organizationId: string,
  userId: string | null,
  fileId?: string | null
): Promise<SaveResultsResponse> {
  const results: SaveResultsResponse = { savedToEnrichment: 0, savedToCompanies: 0, errors: [] };

  for (const org of organizations) {
    try {
      const phoneNumber = org.primary_phone?.number || org.phone || null;
      const sanitizedPhone = org.primary_phone?.sanitized_number || org.sanitized_phone || null;
      const phoneSource = org.primary_phone?.source || null;
      const phoneCountryCode = extractCountryCodeFromPhone(sanitizedPhone);

      let city = org.city, state = org.state, country = org.country;
      let street_address = org.street_address || org.raw_address;
      let postal_code = org.postal_code;

      if ((!city || !country) && org.locations?.length) {
        const loc = org.locations.find(l => l.is_primary) || org.locations[0];
        city = city || loc.city; state = state || loc.state; country = country || loc.country;
        street_address = street_address || loc.street_address || loc.raw_address;
        postal_code = postal_code || loc.postal_code;
      }
      const locationString = [city, state, country].filter(Boolean).join(", ") || null;

      // Save to enrichment_organizations
      const enrichmentData: Record<string, any> = {
        apollo_org_id: org.id, name: org.name, website_url: org.website_url,
        linkedin_url: org.linkedin_url, twitter_url: org.twitter_url, facebook_url: org.facebook_url,
        blog_url: org.blog_url, angellist_url: org.angellist_url, crunchbase_url: org.crunchbase_url,
        primary_phone: phoneNumber, sanitized_phone: sanitizedPhone, phone_source: phoneSource,
        industry: org.industry, industries: org.industries, secondary_industries: org.secondary_industries,
        sic_codes: org.sic_codes, naics_codes: org.naics_codes,
        estimated_num_employees: org.estimated_num_employees,
        annual_revenue: org.annual_revenue || org.organization_revenue,
        annual_revenue_printed: org.annual_revenue_printed || org.organization_revenue_printed,
        market_cap: org.market_cap, publicly_traded_symbol: org.publicly_traded_symbol,
        publicly_traded_exchange: org.publicly_traded_exchange, logo_url: org.logo_url,
        primary_domain: org.primary_domain || org.domain, founded_year: org.founded_year,
        languages: org.languages ? (Array.isArray(org.languages) ? org.languages.join(',') : org.languages) : null,
        city, state, country, raw_address: street_address, street_address, postal_code,
        short_description: org.short_description, seo_description: org.seo_description,
        alexa_ranking: org.alexa_ranking, time_zone: org.time_zone,
        headcount_growth_6m: org.organization_headcount_six_month_growth,
        headcount_growth_12m: org.organization_headcount_twelve_month_growth,
        headcount_growth_24m: org.organization_headcount_twenty_four_month_growth,
        total_funding: org.total_funding, total_funding_printed: org.total_funding_printed,
        latest_funding_stage: org.latest_funding_stage, owned_by_organization_id: org.owned_by_organization_id,
        organization_id: organizationId, updated_at: new Date().toISOString(),
      };

      const { error: enrichErr } = await supabase.from("enrichment_organizations").upsert(enrichmentData, { onConflict: "apollo_org_id" });
      if (!enrichErr) results.savedToEnrichment++;

      // Save to companies
      const companyData: Record<string, any> = {
        name: org.name, domain: org.primary_domain || org.domain, website: org.website_url,
        linkedin: org.linkedin_url, twitter: org.twitter_url, facebook: org.facebook_url,
        crunchbase: org.crunchbase_url, angellist: org.angellist_url, logo_url: org.logo_url,
        industry: org.industry, employee_count: org.estimated_num_employees,
        revenue: org.annual_revenue_printed || org.organization_revenue_printed,
        market_cap: org.market_cap, location: locationString, city, state, country,
        address: street_address, postal_code, phone: phoneNumber, sanitized_phone: sanitizedPhone,
        phone_country_code: phoneCountryCode, stock_symbol: org.publicly_traded_symbol,
        stock_exchange: org.publicly_traded_exchange, about: org.short_description,
        description: org.short_description, founded_year: org.founded_year ? String(org.founded_year) : null,
        apollo_org_id: org.id, organization_id: organizationId,
        headcount_growth_6m: org.organization_headcount_six_month_growth,
        headcount_growth_12m: org.organization_headcount_twelve_month_growth,
        headcount_growth_24m: org.organization_headcount_twenty_four_month_growth,
        alexa_ranking: org.alexa_ranking,
        company_data: {
          keywords: org.keywords, technologies: org.technology_names, funding_stage: org.latest_funding_stage,
          total_funding: org.total_funding_printed, industries: org.industries,
          headcount_growth: {
            six_month: org.organization_headcount_six_month_growth,
            twelve_month: org.organization_headcount_twelve_month_growth,
            twenty_four_month: org.organization_headcount_twenty_four_month_growth,
          },
          phone_details: org.primary_phone, owned_by: org.owned_by_organization,
        },
      };

      if (fileId) companyData.file_id = fileId;

      const cleanPayload = (data: Record<string, any>) => Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== null && v !== undefined && v !== "")
      );

      const { data: existingByApollo } = await supabase.from("companies").select("id, status, company_data")
        .eq("apollo_org_id", org.id).eq("organization_id", organizationId).maybeSingle();

      let targetId = existingByApollo?.id;
      let existingStatus = existingByApollo?.status;
      let existingJson = existingByApollo?.company_data || {};

      if (!targetId && (org.primary_domain || org.domain)) {
        const { data: existingByDomain } = await supabase.from("companies").select("id, status, company_data")
          .eq("domain", org.primary_domain || org.domain).eq("organization_id", organizationId).maybeSingle();
        targetId = existingByDomain?.id;
        existingStatus = existingByDomain?.status;
        existingJson = existingByDomain?.company_data || {};
      }

      if (targetId) {
        const patchData = cleanPayload(companyData);
        if (existingStatus === "Active") { delete patchData.status; delete patchData.stage; }
        patchData.company_data = { ...existingJson, ...companyData.company_data };
        patchData.updated_by = userId;
        patchData.updated_at = new Date().toISOString();
        const { error } = await supabase.from("companies").update(patchData).eq("id", targetId);
        if (!error) results.savedToCompanies++;
        else results.errors.push(`${org.name}: ${error.message}`);
      } else {
        companyData.created_by = userId;
        companyData.updated_by = userId;
        companyData.status = "Intelligence";
        companyData.stage = "Identified";
        const { error } = await supabase.from("companies").insert(companyData);
        if (!error) results.savedToCompanies++;
        else if (!error.message?.includes("duplicate")) results.errors.push(`${org.name}: ${error.message}`);
      }

      // Save related data
      if (org.keywords?.length) {
        await supabase.from("enrichment_org_keywords").upsert(
          org.keywords.map(k => ({ apollo_org_id: org.id, keyword: k })), { onConflict: "apollo_org_id,keyword" }
        );
      }
      if (org.current_technologies?.length) {
        await supabase.from("enrichment_org_technologies").upsert(
          org.current_technologies.map(t => ({ apollo_org_id: org.id, uid: t.uid, name: t.name, category: t.category })),
          { onConflict: "apollo_org_id,uid" }
        );
      } else if (org.technology_names?.length) {
        await supabase.from("enrichment_org_technologies").upsert(
          org.technology_names.map((t, i) => ({ apollo_org_id: org.id, uid: `${org.id}_tech_${i}`, name: t, category: null })),
          { onConflict: "apollo_org_id,uid" }
        );
      }
      if (org.funding_events?.length) {
        await supabase.from("enrichment_org_funding_events").upsert(
          org.funding_events.map(e => ({
            id: e.id, apollo_org_id: org.id, date: e.date || e.announced_date,
            type: e.type || e.funding_type, investors: e.investors, amount: String(e.amount || ''), currency: e.currency,
          })), { onConflict: "id" }
        );
      }
      if (org.departmental_head_count) {
        await supabase.from("enrichment_org_departments").upsert(
          Object.entries(org.departmental_head_count).map(([dept, count]) => ({
            apollo_org_id: org.id, department_name: dept, head_count: count,
          })), { onConflict: "apollo_org_id,department_name" }
        );
      }
    } catch (err: any) {
      results.errors.push(`${org.name}: ${err.message}`);
    }
  }
  console.log(`[Save] Enrichment: ${results.savedToEnrichment}, Companies: ${results.savedToCompanies}`);
  return results;
}

// ============================================================================
// PROMOTE TO ACTIVE CRM
// ============================================================================

export async function promoteToActiveCRM(companyId: number): Promise<any> {
  const { data, error } = await supabase.from("companies")
    .update({ status: "Active", stage: "Targeting", updated_at: new Date().toISOString() })
    .eq("id", companyId).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function bulkPromoteToActiveCRM(companyIds: number[]): Promise<{ success: number; failed: number }> {
  let success = 0, failed = 0;
  for (const id of companyIds) { try { await promoteToActiveCRM(id); success++; } catch { failed++; } }
  return { success, failed };
}

// ============================================================================
// ENRICH ORGANIZATION
// ============================================================================

export async function enrichOrganization(domain: string, apolloOrgId?: string): Promise<ApolloOrganization> {
  const { userId, organizationId } = await getCurrentUserAndOrg();
  const { data, error } = await supabase.functions.invoke("apollo-company-enrich", {
    body: { domain: domain.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0], company_id: apolloOrgId, organization_id: organizationId, user_id: userId },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (organizationId && (data?.id || apolloOrgId)) await saveAllSearchResultsToDatabase([data], organizationId, userId);
  return data;
}

// ============================================================================
// GET COMPLETE ORGANIZATION INFO
// ============================================================================

export async function getCompleteOrganizationInfo(apolloOrgId: string): Promise<ApolloOrganization> {
  const { userId, organizationId } = await getCurrentUserAndOrg();
  const { data, error } = await supabase.functions.invoke("apollo-organization-info", {
    body: { organization_id: apolloOrgId, org_id: organizationId, user_id: userId },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  const org = data?.organization || data;
  if (organizationId) await saveAllSearchResultsToDatabase([org], organizationId, userId);
  return org;
}

// ============================================================================
// API LOGS
// ============================================================================

export async function getApolloApiLogs(options?: { functionName?: string; limit?: number; startDate?: Date; endDate?: Date }): Promise<any[]> {
  const { organizationId } = await getCurrentUserAndOrg();
  if (!organizationId) throw new Error("No organization found");
  let query = supabase.from("apollo_api_logs").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
  if (options?.functionName) query = query.eq("function_name", options.functionName);
  if (options?.startDate) query = query.gte("created_at", options.startDate.toISOString());
  if (options?.endDate) query = query.lte("created_at", options.endDate.toISOString());
  query = query.limit(options?.limit || 100);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getApolloApiLogById(logId: string): Promise<any> {
  const { data, error } = await supabase.from("apollo_api_logs").select("*").eq("id", logId).single();
  if (error) throw error;
  return data;
}

// ============================================================================
// WORKSPACE FILE FUNCTIONS
// ============================================================================

export async function addCompanyToWorkspaceFile(companyId: number, fileId: string, userId: string | null): Promise<void> {
  const { error } = await supabase.from("company_workspace_files").upsert(
    { company_id: companyId, file_id: fileId, added_by: userId }, { onConflict: "company_id,file_id" }
  );
  if (error && !error.message?.includes("duplicate")) throw error;
}

export async function bulkAddCompaniesToWorkspaceFile(companyIds: number[], fileId: string, userId: string | null): Promise<{ success: number; failed: number }> {
  let success = 0, failed = 0;
  for (const id of companyIds) { try { await addCompanyToWorkspaceFile(id, fileId, userId); success++; } catch { failed++; } }
  return { success, failed };
}

// ============================================================================
// GET COMPANY DATA
// ============================================================================

export async function getCompanyById(companyId: number): Promise<any> {
  const { data, error } = await supabase.from("companies").select("*").eq("id", companyId).single();
  if (error) throw new Error(error.message);
  if (data?.apollo_org_id) {
    const [keywords, techs, funding, depts] = await Promise.all([
      supabase.from("enrichment_org_keywords").select("keyword").eq("apollo_org_id", data.apollo_org_id),
      supabase.from("enrichment_org_technologies").select("*").eq("apollo_org_id", data.apollo_org_id),
      supabase.from("enrichment_org_funding_events").select("*").eq("apollo_org_id", data.apollo_org_id),
      supabase.from("enrichment_org_departments").select("*").eq("apollo_org_id", data.apollo_org_id),
    ]);
    return { ...data, keywords: keywords.data?.map(k => k.keyword) || [], technologies: techs.data || [], funding_events: funding.data || [], departments: depts.data || [] };
  }
  return data;
}

export async function getStoredIntelligence(apolloOrgId: string): Promise<any> {
  const [org, keywords, techs, funding, depts] = await Promise.all([
    supabase.from("enrichment_organizations").select("*").eq("apollo_org_id", apolloOrgId).single(),
    supabase.from("enrichment_org_keywords").select("keyword").eq("apollo_org_id", apolloOrgId),
    supabase.from("enrichment_org_technologies").select("*").eq("apollo_org_id", apolloOrgId),
    supabase.from("enrichment_org_funding_events").select("*").eq("apollo_org_id", apolloOrgId),
    supabase.from("enrichment_org_departments").select("*").eq("apollo_org_id", apolloOrgId),
  ]);
  if (org.error) return null;
  return { ...org.data, keywords: keywords.data?.map(k => k.keyword) || [], technologies: techs.data || [], funding_events: funding.data || [], departments: depts.data || [] };
}

// ============================================================================
// CSV EXPORT
// ============================================================================

export function exportCompaniesToCSV(companies: any[]): string {
  const headers = ["Name", "Domain", "Industry", "Location", "City", "State", "Country", "Phone", "Employees", "Revenue", "Market Cap", "Stock Symbol", "Stock Exchange", "Founded Year", "Website", "LinkedIn", "Status", "Stage"];
  const rows = companies.map(c => [c.name || "", c.domain || "", c.industry || "", c.location || "", c.city || "", c.state || "", c.country || "", c.phone || "", c.employee_count || "", c.revenue || "", c.market_cap || "", c.stock_symbol || "", c.stock_exchange || "", c.founded_year || c.start_date || "", c.website || "", c.linkedin || "", c.status || "", c.stage || ""]);
  return [headers.join(","), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
}

// ============================================================================
// LEGACY EXPORTS
// ============================================================================

export const saveSearchResultsToDatabase = saveAllSearchResultsToDatabase;

export async function addCompanyToCRM(org: ApolloOrganization, organizationId: string, userId: string | null, fileId?: string | null): Promise<any> {
  await saveAllSearchResultsToDatabase([org], organizationId, userId, fileId);
  const { data } = await supabase.from("companies").select("*").eq("apollo_org_id", org.id).eq("organization_id", organizationId).single();
  if (data) return promoteToActiveCRM(data.id);
  return data;
}