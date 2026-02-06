// Hrumbles-Front-End_UI/src/utils/companyDataExtractor.ts

/**
 * Utility functions to extract and format data from company enrichment responses
 */

export interface ExtractedCompanyData {
  // Basic Info
  name: string | null;
  shortDescription: string | null;
  logoUrl: string | null;
  
  // Industry
  industry: string | null;
  industries: string[];
  secondaryIndustries: string[];
  
  // Location
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  streetAddress: string | null;
  rawAddress: string | null;
  
  // Contact
  websiteUrl: string | null;
  primaryDomain: string | null;
  phoneNumber: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  facebookUrl: string | null;
  
  // Company Details
  foundedYear: number | null;
  estimatedEmployees: number | null;
  
  // Financial
  annualRevenue: number | null;
  annualRevenuePrinted: string | null;
  totalFunding: number | null;
  totalFundingPrinted: string | null;
  latestFundingStage: string | null;
  latestFundingRoundDate: string | null;
  
  // Public Company
  publiclyTradedSymbol: string | null;
  publiclyTradedExchange: string | null;
  
  // Classification
  sicCodes: string[];
  naicsCodes: string[];
  
  // Additional
  alexaRanking: number | null;
  numSuborganizations: number;
  retailLocationCount: number;
  languages: string[];
  
  // Technologies & Keywords (from enrichment tables)
  technologies: any[];
  keywords: string[];
  departmentalHeadCount: any[];
  fundingEvents: any[];
  
  // Raw
  rawData: any;
  isEnriched: boolean;
}

/**
 * Extract normalized data from company with enrichment_organizations
 */
export const extractCompanyFromRaw = (company: any): ExtractedCompanyData => {
  const enrichment = company?.enrichment_organizations;
  const rawResponse = company?.enrichment_org_raw_responses?.[0]?.raw_json;
  const org = rawResponse?.organization || {};
  
  const isEnriched = Boolean(enrichment || Object.keys(org).length > 0);

  return {
    // Basic Info
    name: enrichment?.name || company.name || null,
    shortDescription: enrichment?.short_description || company.about || null,
    logoUrl: enrichment?.logo_url || company.logo_url || null,
    
    // Industry
    industry: enrichment?.industry || company.industry || null,
    industries: enrichment?.industries || org.industries || (company.industry ? [company.industry] : []),
    secondaryIndustries: enrichment?.secondary_industries || org.secondary_industries || [],
    
    // Location
    city: enrichment?.city || org.city || company.location?.split(',')[0]?.trim() || null,
    state: enrichment?.state || org.state || null,
    country: enrichment?.country || org.country || null,
    postalCode: enrichment?.postal_code || org.postal_code || null,
    streetAddress: enrichment?.street_address || org.street_address || null,
    rawAddress: org.raw_address || company.address || null,
    
    // Contact
    websiteUrl: enrichment?.website_url || company.website || null,
    primaryDomain: enrichment?.primary_domain || company.domain || null,
    phoneNumber: enrichment?.primary_phone || org.phone || null,
    linkedinUrl: enrichment?.linkedin_url || company.linkedin || null,
    twitterUrl: enrichment?.twitter_url || company.twitter || null,
    facebookUrl: enrichment?.facebook_url || company.facebook || null,
    
    // Company Details
    foundedYear: enrichment?.founded_year || (company.start_date ? parseInt(company.start_date) : null),
    estimatedEmployees: enrichment?.estimated_num_employees || company.employee_count || null,
    
    // Financial
    annualRevenue: enrichment?.annual_revenue || company.revenue || null,
    annualRevenuePrinted: enrichment?.annual_revenue_printed || null,
    totalFunding: enrichment?.total_funding || null,
    totalFundingPrinted: enrichment?.total_funding_printed || null,
    latestFundingStage: org.latest_funding_stage || null,
    latestFundingRoundDate: org.latest_funding_round_date || null,
    
    // Public Company
    publiclyTradedSymbol: enrichment?.publicly_traded_symbol || null,
    publiclyTradedExchange: enrichment?.publicly_traded_exchange || null,
    
    // Classification
    sicCodes: enrichment?.sic_codes || org.sic_codes || [],
    naicsCodes: enrichment?.naics_codes || org.naics_codes || [],
    
    // Additional
    alexaRanking: enrichment?.alexa_ranking || org.alexa_ranking || null,
    numSuborganizations: org.num_suborganizations || 0,
    retailLocationCount: org.retail_location_count || 0,
    languages: org.languages || [],
    
    // From related enrichment tables
    technologies: enrichment?.enrichment_org_technologies || [],
    keywords: (enrichment?.enrichment_org_keywords || []).map((k: any) => k.keyword),
    departmentalHeadCount: enrichment?.enrichment_org_departments || [],
    fundingEvents: enrichment?.enrichment_org_funding_events || [],
    
    // Raw
    rawData: rawResponse,
    isEnriched,
  };
};

/**
 * Check if a value contains meaningful data
 */
export const hasCompanyData = (value: any): boolean => {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
};

/**
 * Format currency values
 */
export const formatCompanyCurrency = (amount: number | string | null): string => {
  if (!amount) return 'N/A';
  if (typeof amount === 'string') return amount;
  
  if (amount >= 1000000000) {
    return `$${(amount / 1000000000).toFixed(1)}B`;
  }
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format large numbers with K, M, B suffixes
 */
export const formatCompanyNumber = (num: number | null): string => {
  if (!num) return 'N/A';
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

/**
 * Group technologies by category
 */
export const groupCompanyTechnologies = (technologies: any[]): Record<string, any[]> => {
  const grouped: Record<string, any[]> = {};
  
  technologies?.forEach(tech => {
    const category = tech.category || 'Other';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(tech);
  });
  
  // Sort categories by count (descending)
  return Object.fromEntries(
    Object.entries(grouped).sort((a, b) => b[1].length - a[1].length)
  );
};

/**
 * Process departments for display
 */
export const processDepartments = (departments: any[]): { 
  active: any[]; 
  total: number; 
} => {
  const active = (departments || [])
    .filter((d: any) => d.head_count > 0)
    .sort((a: any, b: any) => b.head_count - a.head_count);
  
  const total = active.reduce((sum: number, d: any) => sum + d.head_count, 0);
  
  return { active, total };
};

/**
 * Get company initials for avatar fallback
 */
export const getCompanyInitials = (name: string | null): string => {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
};

/**
 * Format address from components
 */
export const formatCompanyAddress = (data: ExtractedCompanyData): string | null => {
  const parts = [
    data.streetAddress,
    data.city,
    data.state,
    data.postalCode,
    data.country
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(', ') : null;
};