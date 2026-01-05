// src/utils/apolloDataExtractor.ts

export interface ExtractedApolloData {
  // Personal
  photoUrl: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  headline: string | null;
  emailStatus: 'verified' | 'unverified' | 'unknown';
  
  // Contact
  primaryPhone: string | null;
  allPhones: Array<{ number: string; type: string }>;
  
  // Professional
  seniority: string | null;
  seniorityLabel: string;
  functions: string[];
  departments: string[];
  
  // Location
  city: string | null;
  state: string | null;
  country: string | null;
  fullLocation: string;
  
  // Company
  companyName: string | null;
  companyWebsite: string | null;
  companyLinkedIn: string | null;
  companyIndustry: string | null;
  companySize: number | null;
  companyLocation: string | null;
  
  // Employment History
  employmentHistory: Array<{
    company: string;
    title: string;
    startDate: string | null;
    endDate: string | null;
    current: boolean;
  }>;
  
  // Meta
  lastEnrichedAt: string;
}

export function extractApolloData(apolloData: any): ExtractedApolloData | null {
  if (!apolloData) return null;
  
  try {
    const data = typeof apolloData === 'string' ? JSON.parse(apolloData) : apolloData;
    
    // Extract phone numbers
    const phones = (data.phone_numbers || []).map((p: any) => ({
      number: p.sanitized_number || p.raw_number,
      type: p.type || 'unknown'
    }));
    
    // Build location string
    const locationParts = [data.city, data.state, data.country].filter(Boolean);
    const fullLocation = locationParts.join(', ') || 'Location not available';
    
    // Company location
    const companyLocationParts = [
      data.organization?.city,
      data.organization?.state,
      data.organization?.country
    ].filter(Boolean);
    const companyLocation = companyLocationParts.join(', ') || null;
    
    // Seniority label
    const seniorityLabels: Record<string, string> = {
      'owner': 'Owner/Founder',
      'c_suite': 'C-Level',
      'vp': 'VP',
      'head': 'Head/Director',
      'manager': 'Manager',
      'senior': 'Senior',
      'entry': 'Entry Level',
      'intern': 'Intern'
    };
    
    // Extract employment history
    const employmentHistory = (data.employment_history || []).map((job: any) => ({
      company: job.organization_name || 'Unknown Company',
      title: job.title || 'Unknown Title',
      startDate: job.start_date,
      endDate: job.end_date,
      current: job.current || false
    }));
    
    return {
      // Personal
      photoUrl: data.photo_url || null,
      firstName: data.first_name || '',
      lastName: data.last_name || '',
      fullName: data.name || `${data.first_name} ${data.last_name}`,
      headline: data.headline || null,
      emailStatus: data.email_status || 'unknown',
      
      // Contact
      primaryPhone: phones[0]?.number || null,
      allPhones: phones,
      
      // Professional
      seniority: data.seniority || null,
      seniorityLabel: seniorityLabels[data.seniority] || data.seniority || 'Not specified',
      functions: data.functions || [],
      departments: data.departments || [],
      
      // Location
      city: data.city || null,
      state: data.state || null,
      country: data.country || null,
      fullLocation,
      
      // Company
      companyName: data.organization?.name || null,
      companyWebsite: data.organization?.website_url || null,
      companyLinkedIn: data.organization?.linkedin_url || null,
      companyIndustry: data.organization?.industry || null,
      companySize: data.organization?.estimated_num_employees || null,
      companyLocation,
      
      // Employment History
      employmentHistory,
      
      // Meta
      lastEnrichedAt: data.last_enriched_at || new Date().toISOString()
    };
  } catch (error) {
    console.error('Error extracting Apollo data:', error);
    return null;
  }
}