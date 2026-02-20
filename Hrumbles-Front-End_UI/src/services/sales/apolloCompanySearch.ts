// src/services/sales/apolloCompanySearch.ts
// OPTIMIZED: Faster perceived performance with immediate display
// Key changes:
//   1. searchCompaniesInApolloV2 returns immediately with raw Apollo data
//   2. DB save happens server-side (edge function handles it)
//   3. No duplicate client-side save logic
//   4. Cached getCurrentUserAndOrg to avoid repeated auth calls
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// TYPES (unchanged - full compatibility)
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
// CACHED USER/ORG LOOKUP (avoid repeated auth calls)
// ============================================================================

let _cachedUserOrg: { userId: string | null; organizationId: string | null; cachedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCurrentUserAndOrg(): Promise<{ userId: string | null; organizationId: string | null }> {
  if (_cachedUserOrg && (Date.now() - _cachedUserOrg.cachedAt) < CACHE_TTL) {
    return { userId: _cachedUserOrg.userId, organizationId: _cachedUserOrg.organizationId };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { userId: null, organizationId: null };
    const { data: profile } = await supabase
      .from('hr_employees')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    const result = { userId: user.id, organizationId: profile?.organization_id || null };
    _cachedUserOrg = { ...result, cachedAt: Date.now() };
    return result;
  } catch {
    return { userId: null, organizationId: null };
  }
}

// Clear cache on auth state change
supabase.auth.onAuthStateChange(() => { _cachedUserOrg = null; });

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

function cleanPayload(data: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== null && v !== undefined && v !== "")
  );
}

// ============================================================================
// V2: SEARCH COMPANIES (Server handles all saving via batch ops)
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

  const { data, error } = await supabase.functions.invoke("apollo-company-search-v3", {
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
// SAVE RESULTS TO DATABASE (Optimized with batch operations)
// ============================================================================

export async function saveAllSearchResultsToDatabase(
  organizations: ApolloOrganization[],
  organizationId: string,
  userId: string | null,
  fileId?: string | null
): Promise<SaveResultsResponse> {
  const results: SaveResultsResponse = { savedToEnrichment: 0, savedToCompanies: 0, errors: [] };
  if (organizations.length === 0) return results;

  // ========================================================================
  // BATCH 1: Upsert all enrichment records at once
  // ========================================================================
  const enrichmentRows = organizations.map(org => {
    const phoneNumber = org.primary_phone?.number || org.phone || null;
    const sanitizedPhone = org.primary_phone?.sanitized_number || org.sanitized_phone || null;
    const phoneSource = org.primary_phone?.source || null;

    let city = org.city, state = org.state, country = org.country;
    let street_address = org.street_address || org.raw_address;
    let postal_code = org.postal_code;

    if ((!city || !country) && org.locations?.length) {
      const loc = org.locations.find(l => l.is_primary) || org.locations[0];
      city = city || loc.city; state = state || loc.state; country = country || loc.country;
      street_address = street_address || loc.street_address || loc.raw_address;
      postal_code = postal_code || loc.postal_code;
    }

    return {
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
      latest_funding_stage: org.latest_funding_stage,
      owned_by_organization_id: org.owned_by_organization_id,
      organization_id: organizationId, updated_at: new Date().toISOString(),
    };
  });

  const { error: enrichErr } = await supabase
    .from("enrichment_organizations")
    .upsert(enrichmentRows, { onConflict: "apollo_org_id" });
  if (!enrichErr) results.savedToEnrichment = enrichmentRows.length;
  else console.warn("[Batch Enrich] Error:", enrichErr.message);

  // ========================================================================
  // BATCH 2: Bulk lookup existing companies
  // ========================================================================
  const apolloIds = organizations.map(o => o.id).filter(Boolean);
  const domains = organizations.map(o => o.primary_domain || o.domain).filter(Boolean) as string[];
  const existingMap = new Map<string, { id: number; status: string; company_data: any }>();

  if (apolloIds.length > 0) {
    const { data: byApollo } = await supabase
      .from("companies")
      .select("id, status, company_data, apollo_org_id, domain, name")
      .eq("organization_id", organizationId)
      .in("apollo_org_id", apolloIds);

    if (byApollo) {
      for (const row of byApollo) {
        if (row.apollo_org_id) existingMap.set(`apollo:${row.apollo_org_id}`, row);
        if (row.domain) existingMap.set(`domain:${row.domain}`, row);
        if (row.name) existingMap.set(`name:${row.name}`, row);
      }
    }
  }

  const unmatchedDomains = domains.filter(d => !existingMap.has(`domain:${d}`));
  if (unmatchedDomains.length > 0) {
    const { data: byDomain } = await supabase
      .from("companies")
      .select("id, status, company_data, apollo_org_id, domain, name")
      .eq("organization_id", organizationId)
      .in("domain", unmatchedDomains);
    if (byDomain) {
      for (const row of byDomain) {
        if (row.domain) existingMap.set(`domain:${row.domain}`, row);
        if (row.name) existingMap.set(`name:${row.name}`, row);
      }
    }
  }

  // Query 3: Find remaining by name (handles unique constraint: name + organization_id)
  const companyNames = organizations.map(o => o.name).filter(Boolean);
  const unmatchedNames = companyNames.filter(n => !existingMap.has(`name:${n}`));
  if (unmatchedNames.length > 0) {
    const { data: byName } = await supabase
      .from("companies")
      .select("id, status, company_data, apollo_org_id, domain, name")
      .eq("organization_id", organizationId)
      .in("name", unmatchedNames);
    if (byName) {
      for (const row of byName) {
        if (row.name) existingMap.set(`name:${row.name}`, row);
      }
    }
  }

  // ========================================================================
  // BATCH 3: Process inserts and updates
  // ========================================================================
  const toInsert: Record<string, any>[] = [];
  const toUpdate: { id: number; data: Record<string, any> }[] = [];

  for (const org of organizations) {
    const phoneNumber = org.primary_phone?.number || org.phone || null;
    const sanitizedPhone = org.primary_phone?.sanitized_number || org.sanitized_phone || null;
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

    // Find existing: priority = apollo_org_id > domain > name (unique constraint)
    const existing = existingMap.get(`apollo:${org.id}`) ||
      (companyData.domain ? existingMap.get(`domain:${companyData.domain}`) : null) ||
      existingMap.get(`name:${org.name}`);

    if (existing) {
      const patchData = cleanPayload(companyData);
      if (existing.status === "Active") { delete patchData.status; delete patchData.stage; }
      patchData.company_data = { ...(existing.company_data || {}), ...companyData.company_data };
      patchData.updated_by = userId;
      patchData.updated_at = new Date().toISOString();
      // Don't change the unique constraint columns
      delete patchData.name;
      delete patchData.organization_id;
      toUpdate.push({ id: existing.id, data: patchData });
    } else {
      companyData.created_by = userId;
      companyData.updated_by = userId;
      companyData.status = "Intelligence";
      companyData.stage = "Identified";
      toInsert.push(companyData);
    }
  }

  // Batch insert
  if (toInsert.length > 0) {
    const cleaned = toInsert.map(r => cleanPayload(r));
    const { data: inserted, error: insertErr } = await supabase.from("companies").insert(cleaned).select("id");
    if (!insertErr) {
      results.savedToCompanies += inserted?.length || 0;
    } else {
      // Fallback: insert individually, handling name+organization_id duplicates
      for (const row of cleaned) {
        const { data: single, error } = await supabase.from("companies").insert(row).select("id").maybeSingle();
        if (!error && single) {
          results.savedToCompanies++;
        } else if (error?.code === '23505') {
          // Duplicate name+organization_id — find existing and update
          const { data: dup } = await supabase
            .from("companies")
            .select("id")
            .eq("name", row.name)
            .eq("organization_id", organizationId)
            .maybeSingle();
          if (dup) {
            const patch = { ...row };
            delete patch.name; delete patch.organization_id;
            delete patch.created_by; delete patch.created_at;
            delete patch.status; delete patch.stage;
            patch.updated_by = userId;
            patch.updated_at = new Date().toISOString();
            await supabase.from("companies").update(cleanPayload(patch)).eq("id", dup.id);
            results.savedToCompanies++;
          }
        } else if (error) {
          results.errors.push(`${row.name}: ${error.message}`);
        }
      }
    }
  }

  // Parallel updates
  if (toUpdate.length > 0) {
    const updateResults = await Promise.allSettled(
      toUpdate.map(({ id, data }) => supabase.from("companies").update(data).eq("id", id))
    );
    results.savedToCompanies += updateResults.filter(r => r.status === "fulfilled" && !(r.value as any).error).length;
  }

  // ========================================================================
  // BATCH 4: Related data in parallel
  // ========================================================================
  const allKeywords: any[] = [];
  const allTechs: any[] = [];
  const allFunding: any[] = [];
  const allDepts: any[] = [];

  for (const org of organizations) {
    if (org.keywords?.length) {
      for (const k of org.keywords) allKeywords.push({ apollo_org_id: org.id, keyword: k });
    }
    if (org.current_technologies?.length) {
      for (const t of org.current_technologies) allTechs.push({ apollo_org_id: org.id, uid: t.uid, name: t.name, category: t.category });
    } else if (org.technology_names?.length) {
      org.technology_names.forEach((t, i) => allTechs.push({ apollo_org_id: org.id, uid: `${org.id}_tech_${i}`, name: t, category: null }));
    }
    if (org.funding_events?.length) {
      for (const e of org.funding_events) allFunding.push({ id: e.id, apollo_org_id: org.id, date: e.date || e.announced_date, type: e.type || e.funding_type, investors: e.investors, amount: String(e.amount || ''), currency: e.currency });
    }
    if (org.departmental_head_count) {
      for (const [dept, count] of Object.entries(org.departmental_head_count)) allDepts.push({ apollo_org_id: org.id, department_name: dept, head_count: count });
    }
  }

  await Promise.allSettled([
    allKeywords.length > 0 ? supabase.from("enrichment_org_keywords").upsert(allKeywords, { onConflict: "apollo_org_id,keyword" }) : Promise.resolve(),
    allTechs.length > 0 ? supabase.from("enrichment_org_technologies").upsert(allTechs, { onConflict: "apollo_org_id,uid" }) : Promise.resolve(),
    allFunding.length > 0 ? supabase.from("enrichment_org_funding_events").upsert(allFunding, { onConflict: "id" }) : Promise.resolve(),
    allDepts.length > 0 ? supabase.from("enrichment_org_departments").upsert(allDepts, { onConflict: "apollo_org_id,department_name" }) : Promise.resolve(),
  ]);

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