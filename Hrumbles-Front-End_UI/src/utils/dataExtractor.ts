// Utility functions to extract data from enrichment_raw_responses
// This ensures we always show data even if it's not normalized in the database

export const extractFromRaw = (contact: any) => {
  const rawResponse = contact?.enrichment_raw_responses?.[0]?.raw_json;
  const person = rawResponse?.person || {};
  const org = person?.organization || {};
  const contactData = person?.contact || {};

  return {
    // Personal Information
    firstName: person.first_name || contact.name?.split(' ')[0],
    lastName: person.last_name || contact.name?.split(' ').slice(1).join(' '),
    fullName: person.name || contact.name,
    headline: person.headline,
    photoUrl: person.photo_url || contact.photo_url,
    title: person.title || contact.job_title,
    seniority: person.seniority,
    
    // Contact Details
    primaryEmail: person.email || contact.email,
    emailStatus: person.email_status || contactData.email_status,
    emailTrueStatus: contactData.email_true_status,
    personalEmails: person.personal_emails || [],
    allEmails: [
      ...(person.email ? [{ email: person.email, status: person.email_status, source: 'Apollo' }] : []),
      ...(contact.enrichment_contact_emails || [])
    ],
    
    // Phone Details
    primaryPhone: contact.mobile,
    phoneNumbers: contact.enrichment_contact_phones || [],
    hasDirectPhone: contactData.has_direct_phone,
    directDialStatus: contactData.direct_dial_status,
    
    // Location
    city: person.city || contact.city,
    state: person.state || contact.state,
    country: person.country || contact.country,
    postalCode: person.postal_code,
    timezone: person.time_zone || contact.timezone,
    formattedAddress: person.formatted_address,
    
    // Social Links
    linkedinUrl: person.linkedin_url || contact.linkedin_url,
    twitterUrl: person.twitter_url,
    facebookUrl: person.facebook_url,
    githubUrl: person.github_url,
    
    // Professional Details
    departments: person.departments || [],
    subdepartments: person.subdepartments || [],
    functions: person.functions || [],
    intentStrength: person.intent_strength,
    showIntent: person.show_intent,
    revealedForTeam: person.revealed_for_current_team,
    
    // Employment History
    employmentHistory: person.employment_history || contact.enrichment_employment_history || [],
    
    // Organization Details
    organization: {
      id: org.id,
      name: org.name || contact.company_name,
      websiteUrl: org.website_url,
      linkedinUrl: org.linkedin_url,
      twitterUrl: org.twitter_url,
      facebookUrl: org.facebook_url,
      logoUrl: org.logo_url,
      primaryDomain: org.primary_domain,
      primaryPhone: org.primary_phone?.number || org.phone,
      
      // Location
      city: org.city,
      state: org.state,
      country: org.country,
      postalCode: org.postal_code,
      streetAddress: org.street_address,
      rawAddress: org.raw_address,
      
      // Company Details
      industry: org.industry,
      industries: org.industries || [],
      secondaryIndustries: org.secondary_industries || [],
      keywords: org.keywords || [],
      shortDescription: org.short_description,
      
      // Metrics
      estimatedEmployees: org.estimated_num_employees,
      annualRevenue: org.annual_revenue,
      annualRevenuePrinted: org.annual_revenue_printed,
      totalFunding: org.total_funding,
      totalFundingPrinted: org.total_funding_printed,
      foundedYear: org.founded_year,
      alexaRanking: org.alexa_ranking,
      
      // Stock Info
      publiclyTradedSymbol: org.publicly_traded_symbol,
      publiclyTradedExchange: org.publicly_traded_exchange,
      
      // Classifications
      sicCodes: org.sic_codes || [],
      naicsCodes: org.naics_codes || [],
      
      // Technologies
      technologies: org.current_technologies || [],
      technologyNames: org.technology_names || [],
      
      // Funding
      fundingEvents: org.funding_events || [],
      latestFundingStage: org.latest_funding_stage,
      latestFundingRoundDate: org.latest_funding_round_date,
    },
    
    // Raw data for complete access
    rawPerson: person,
    rawOrganization: org,
    rawContact: contactData,
    fullRaw: rawResponse
  };
};

// Helper to safely get nested values
export const safeGet = (obj: any, path: string, defaultValue: any = null) => {
  return path.split('.').reduce((acc, part) => acc?.[part], obj) ?? defaultValue;
};

// Helper to check if data exists
export const hasData = (value: any): boolean => {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
};

// Format currency
export const formatCurrency = (amount: number | string | null): string => {
  if (!amount) return 'N/A';
  if (typeof amount === 'string') return amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format large numbers
export const formatNumber = (num: number | null): string => {
  if (!num) return 'N/A';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

// Calculate employment duration
export const calculateDuration = (startDate: string | null, endDate: string | null): string => {
  if (!startDate) return 'Unknown';
  
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (years === 0) return `${remainingMonths} mo`;
  if (remainingMonths === 0) return `${years} yr`;
  return `${years} yr ${remainingMonths} mo`;
};

// Extract technology categories
export const groupTechnologies = (technologies: any[]): Record<string, any[]> => {
  const grouped: Record<string, any[]> = {};
  
  technologies?.forEach(tech => {
    const category = tech.category || 'Other';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(tech);
  });
  
  return grouped;
};