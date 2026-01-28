// Utility functions to extract company data from enrichment_org_raw_responses
// Ensures we always show data even if it's not normalized in the database

export const extractCompanyFromRaw = (company: any) => {
  const rawResponse = company?.enrichment_org_raw_responses?.[0]?.raw_json;
  const org = rawResponse?.organization || {};

  return {
    // Basic Information
    name: org.name || company.name,
    logoUrl: org.logo_url || company.logo_url,
    primaryDomain: org.primary_domain || company.domain,
    websiteUrl: org.website_url || company.website,
    
    // Contact Information
    primaryPhone: org.primary_phone?.sanitized_number || org.phone,
    phoneNumber: org.primary_phone?.number,
    
    // Location Details
    city: org.city,
    state: org.state,
    country: org.country,
    postalCode: org.postal_code,
    streetAddress: org.street_address,
    rawAddress: org.raw_address,
    
    // Company Details
    industry: org.industry || company.industry,
    industries: org.industries || [],
    secondaryIndustries: org.secondary_industries || [],
    shortDescription: org.short_description || company.about,
    
    // Social Links
    linkedinUrl: org.linkedin_url || company.linkedin,
    linkedinUid: org.linkedin_uid,
    twitterUrl: org.twitter_url || company.twitter,
    facebookUrl: org.facebook_url || company.facebook,
    blogUrl: org.blog_url,
    angellistUrl: org.angellist_url,
    crunchbaseUrl: org.crunchbase_url,
    
    // Metrics
    estimatedEmployees: org.estimated_num_employees || company.employee_count,
    annualRevenue: org.annual_revenue,
    annualRevenuePrinted: org.annual_revenue_printed || company.revenue,
    totalFunding: org.total_funding,
    totalFundingPrinted: org.total_funding_printed,
    foundedYear: org.founded_year || company.start_date,
    alexaRanking: org.alexa_ranking,
    
    // Stock Information
    publiclyTradedSymbol: org.publicly_traded_symbol,
    publiclyTradedExchange: org.publicly_traded_exchange,
    
    // Classifications
    sicCodes: org.sic_codes || [],
    naicsCodes: org.naics_codes || [],
    
    // Technology & Data
    technologies: org.current_technologies || [],
    technologyNames: org.technology_names || [],
    keywords: org.keywords || [],
    languages: org.languages || [],
    
    // Funding
    fundingEvents: org.funding_events || [],
    latestFundingStage: org.latest_funding_stage,
    latestFundingRoundDate: org.latest_funding_round_date,
    
    // Structure
    suborganizations: org.suborganizations || [],
    numSuborganizations: org.num_suborganizations || 0,
    retailLocationCount: org.retail_location_count || 0,
    
    // Departments
    departmentalHeadCount: org.departmental_head_count || {},
    
    // Chart & Organization
    orgChartSector: org.org_chart_sector,
    ownedByOrganizationId: org.owned_by_organization_id,
    
    // Additional
    timezone: org.time_zone,
    snippetsLoaded: org.snippets_loaded,
    
    // Account Information (if present)
    account: org.account || null,
    
    // Raw data for complete access
    rawOrganization: org,
    fullRaw: rawResponse
  };
};

// Helper to safely get nested values
export const safeCompanyGet = (obj: any, path: string, defaultValue: any = null) => {
  return path.split('.').reduce((acc, part) => acc?.[part], obj) ?? defaultValue;
};

// Helper to check if company data exists
export const hasCompanyData = (value: any): boolean => {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
};

// Format currency for companies
export const formatCompanyCurrency = (amount: number | string | null): string => {
  if (!amount) return 'N/A';
  if (typeof amount === 'string') return amount;
  
  if (Math.abs(amount) >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
  if (Math.abs(amount) >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
  if (Math.abs(amount) >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format large numbers for companies
export const formatCompanyNumber = (num: number | null): string => {
  if (!num) return 'N/A';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

// Group technologies by category
export const groupCompanyTechnologies = (technologies: any[]): Record<string, any[]> => {
  const grouped: Record<string, any[]> = {};
  
  technologies?.forEach(tech => {
    const category = tech.category || 'Other';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(tech);
  });
  
  return grouped;
};

// Process department data for visualization
export const processDepartments = (deptData: Record<string, number>) => {
  if (!deptData || Object.keys(deptData).length === 0) {
    return { active: [], inactive: [], total: 0 };
  }

  const entries = Object.entries(deptData);
  const active = entries
    .filter(([_, count]) => count > 0)
    .map(([name, count]) => ({ department_name: name, head_count: count }))
    .sort((a, b) => b.head_count - a.head_count);
  
  const inactive = entries
    .filter(([_, count]) => count === 0)
    .map(([name]) => name);
  
  const total = active.reduce((sum, d) => sum + d.head_count, 0);
  
  return { active, inactive, total };
};

// Calculate employee growth
export const calculateEmployeeGrowth = (company: any) => {
  const raw = company?.enrichment_org_raw_responses?.[0]?.raw_json?.organization;
  
  return {
    sixMonth: raw?.organization_headcount_six_month_growth || null,
    twelveMonth: raw?.organization_headcount_twelve_month_growth || null,
    twentyFourMonth: raw?.organization_headcount_twenty_four_month_growth || null
  };
};

// Group keywords by relevance
export const groupKeywordsByTheme = (keywords: string[]) => {
  const groups: Record<string, string[]> = {
    'Core Business': [],
    'Technology & Tools': [],
    'Services & Solutions': [],
    'Industries': [],
    'Specializations': [],
    'Other': []
  };
  
  keywords.forEach((keyword: string) => {
    if (keyword.match(/recruitment|staffing|hiring|talent|hr/i)) {
      groups['Core Business'].push(keyword);
    } else if (keyword.match(/technology|tech|software|platform|tool|ai|machine learning|cloud/i)) {
      groups['Technology & Tools'].push(keyword);
    } else if (keyword.match(/service|solution|consulting|management|strategy|process/i)) {
      groups['Services & Solutions'].push(keyword);
    } else if (keyword.match(/healthcare|finance|energy|oil|gas|retail|construction/i)) {
      groups['Industries'].push(keyword);
    } else if (keyword.match(/specialist|expert|professional|senior|executive|global/i)) {
      groups['Specializations'].push(keyword);
    } else {
      groups['Other'].push(keyword);
    }
  });
  
  return Object.entries(groups)
    .filter(([_, kws]) => kws.length > 0)
    .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});
};