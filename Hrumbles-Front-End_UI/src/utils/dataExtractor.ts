// Hrumbles-Front-End_UI/src/utils/dataExtractor.ts

/**
 * Utility functions to extract and format data from contact enrichment responses
 * Handles both enriched and non-enriched contact data gracefully
 */

export interface ExtractedData {
  // Personal Information
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  headline: string | null;
  photoUrl: string | null;
  title: string | null;
  seniority: string | null;
  
  // Contact Details
  primaryEmail: string | null;
  emailStatus: string | null;
  emailTrueStatus: string | null;
  personalEmails: string[];
  allEmails: Array<{ email: string; status?: string; source?: string }>;
  
  // Phone Details
  primaryPhone: string | null;
  phoneNumbers: any[];
  hasDirectPhone: boolean;
  directDialStatus: string | null;
  
  // Location
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  timezone: string | null;
  formattedAddress: string | null;
  
  // Social Links
  linkedinUrl: string | null;
  twitterUrl: string | null;
  facebookUrl: string | null;
  githubUrl: string | null;
  
  // Professional Details
  departments: string[];
  subdepartments: string[];
  functions: string[];
  intentStrength: string | null;
  showIntent: boolean | null;
  revealedForTeam: boolean;
  
  // Employment History
  employmentHistory: any[];
  
  // Organization Details
  organization: {
    id: string | null;
    name: string | null;
    websiteUrl: string | null;
    linkedinUrl: string | null;
    twitterUrl: string | null;
    facebookUrl: string | null;
    logoUrl: string | null;
    primaryDomain: string | null;
    primaryPhone: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postalCode: string | null;
    streetAddress: string | null;
    rawAddress: string | null;
    industry: string | null;
    industries: string[];
    secondaryIndustries: string[];
    keywords: string[];
    shortDescription: string | null;
    estimatedEmployees: number | null;
    annualRevenue: number | null;
    annualRevenuePrinted: string | null;
    totalFunding: number | null;
    totalFundingPrinted: string | null;
    foundedYear: number | null;
    alexaRanking: number | null;
    publiclyTradedSymbol: string | null;
    publiclyTradedExchange: string | null;
    sicCodes: string[];
    naicsCodes: string[];
    technologies: any[];
    technologyNames: string[];
    fundingEvents: any[];
    latestFundingStage: string | null;
    latestFundingRoundDate: string | null;
  };
  
  // Raw data for complete access
  rawPerson: any;
  rawOrganization: any;
  rawContact: any;
  fullRaw: any;
  
  // Metadata
  isEnriched: boolean;
}

/**
 * Extract normalized data from contact with enrichment_raw_responses
 * Falls back to base contact data when enrichment is not available
 */
export const extractFromRaw = (contact: any): ExtractedData => {
  const rawResponse = contact?.enrichment_raw_responses?.[0]?.raw_json;
  const person = rawResponse?.person || {};
  const org = person?.organization || {};
  const contactData = person?.contact || {};
  
  // Check if contact has been enriched
  const isEnriched = Boolean(rawResponse && Object.keys(person).length > 0);

  // Build emails array from multiple sources
  const allEmails: Array<{ email: string; status?: string; source?: string }> = [];
  
  // Add primary email from enrichment
  if (person.email) {
    allEmails.push({ 
      email: person.email, 
      status: person.email_status, 
      source: 'Apollo' 
    });
  }
  
  // Add emails from enrichment_contact_emails
  if (contact.enrichment_contact_emails?.length) {
    contact.enrichment_contact_emails.forEach((e: any) => {
      if (e.email && !allEmails.find(existing => existing.email === e.email)) {
        allEmails.push({
          email: e.email,
          status: e.email_status || e.status,
          source: 'Enrichment'
        });
      }
    });
  }

  return {
    // Personal Information
    firstName: person.first_name || contact.name?.split(' ')[0] || null,
    lastName: person.last_name || contact.name?.split(' ').slice(1).join(' ') || null,
    fullName: person.name || contact.name || null,
    headline: person.headline || null,
    photoUrl: person.photo_url || contact.photo_url || null,
    title: person.title || contact.job_title || null,
    seniority: person.seniority || contact.enrichment_people?.[0]?.seniority || null,
    
    // Contact Details
    primaryEmail: person.email || contact.email || null,
    emailStatus: person.email_status || contactData.email_status || null,
    emailTrueStatus: contactData.email_true_status || null,
    personalEmails: person.personal_emails || [],
    allEmails,
    
    // Phone Details
    primaryPhone: contact.mobile || null,
    phoneNumbers: contact.enrichment_contact_phones || [],
    hasDirectPhone: contactData.has_direct_phone || false,
    directDialStatus: contactData.direct_dial_status || null,
    
    // Location
    city: person.city || contact.city || null,
    state: person.state || contact.state || null,
    country: person.country || contact.country || null,
    postalCode: person.postal_code || null,
    timezone: person.time_zone || contact.timezone || null,
    formattedAddress: person.formatted_address || null,
    
    // Social Links
    linkedinUrl: person.linkedin_url || contact.linkedin_url || null,
    twitterUrl: person.twitter_url || null,
    facebookUrl: person.facebook_url || null,
    githubUrl: person.github_url || null,
    
    // Professional Details
    departments: person.departments || [],
    subdepartments: person.subdepartments || [],
    functions: person.functions || [],
    intentStrength: person.intent_strength || null,
    showIntent: person.show_intent ?? null,
    revealedForTeam: person.revealed_for_current_team || false,
    
    // Employment History
    employmentHistory: person.employment_history || 
                       contact.enrichment_people?.[0]?.enrichment_employment_history || 
                       [],
    
    // Organization Details
    organization: {
      id: org.id || null,
      name: org.name || contact.company_name || contact.companies?.name || null,
      websiteUrl: org.website_url || contact.companies?.website || null,
      linkedinUrl: org.linkedin_url || null,
      twitterUrl: org.twitter_url || null,
      facebookUrl: org.facebook_url || null,
      logoUrl: org.logo_url || contact.companies?.logo_url || null,
      primaryDomain: org.primary_domain || null,
      primaryPhone: org.primary_phone?.number || org.phone || null,
      city: org.city || null,
      state: org.state || null,
      country: org.country || null,
      postalCode: org.postal_code || null,
      streetAddress: org.street_address || null,
      rawAddress: org.raw_address || null,
      industry: org.industry || contact.companies?.industry || null,
      industries: org.industries || [],
      secondaryIndustries: org.secondary_industries || [],
      keywords: org.keywords || [],
      shortDescription: org.short_description || null,
      estimatedEmployees: org.estimated_num_employees || null,
      annualRevenue: org.annual_revenue || null,
      annualRevenuePrinted: org.annual_revenue_printed || null,
      totalFunding: org.total_funding || null,
      totalFundingPrinted: org.total_funding_printed || null,
      foundedYear: org.founded_year || null,
      alexaRanking: org.alexa_ranking || null,
      publiclyTradedSymbol: org.publicly_traded_symbol || null,
      publiclyTradedExchange: org.publicly_traded_exchange || null,
      sicCodes: org.sic_codes || [],
      naicsCodes: org.naics_codes || [],
      technologies: org.current_technologies || [],
      technologyNames: org.technology_names || [],
      fundingEvents: org.funding_events || [],
      latestFundingStage: org.latest_funding_stage || null,
      latestFundingRoundDate: org.latest_funding_round_date || null,
    },
    
    // Raw data for complete access
    rawPerson: person,
    rawOrganization: org,
    rawContact: contactData,
    fullRaw: rawResponse,
    
    // Metadata
    isEnriched,
  };
};

/**
 * Safely get nested values from an object
 */
export const safeGet = (obj: any, path: string, defaultValue: any = null): any => {
  return path.split('.').reduce((acc, part) => acc?.[part], obj) ?? defaultValue;
};

/**
 * Check if a value contains meaningful data
 */
export const hasData = (value: any): boolean => {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
};

/**
 * Format currency values
 */
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

/**
 * Format large numbers with K, M, B suffixes
 */
export const formatNumber = (num: number | null): string => {
  if (!num) return 'N/A';
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

/**
 * Calculate employment duration between two dates
 */
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

/**
 * Group technologies by category
 */
export const groupTechnologies = (technologies: any[]): Record<string, any[]> => {
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
 * Get initials from a name
 */
export const getInitials = (name: string | null): string => {
  if (!name) return '??';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

/**
 * Format a date string to readable format
 */
export const formatDate = (dateString: string | null, format: 'short' | 'long' = 'short'): string => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  
  if (format === 'long') {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Get relative time string (e.g., "2 days ago")
 */
export const getRelativeTime = (dateString: string | null): string => {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};