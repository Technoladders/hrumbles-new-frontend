// Hrumbles-Front-End_UI/src/utils/dataExtractor.ts
// Fully defensive — all relation arrays guarded with ?. and ?? []
// Fixes: "Cannot read properties of undefined (reading 'enrichment_contact_emails')"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExtractedData {
  // Identity
  firstName:          string | null;
  lastName:           string | null;
  fullName:           string | null;
  headline:           string | null;
  photoUrl:           string | null;
  title:              string | null;
  seniority:          string | null;

  // Email
  primaryEmail:       string | null;
  emailStatus:        string | null;
  allEmails:          Array<{ email: string; status?: string; source?: string; type?: string }>;

  // Phone
  primaryPhone:       string | null;
  phoneNumbers:       any[];
  hasDirectPhone:     boolean;
  directDialStatus:   string | null;

  // Location
  city:               string | null;
  state:              string | null;
  country:            string | null;
  postalCode:         string | null;
  timezone:           string | null;
  formattedAddress:   string | null;

  // Social
  linkedinUrl:        string | null;
  twitterUrl:         string | null;
  facebookUrl:        string | null;
  githubUrl:          string | null;

  // Professional
  departments:        string[];
  subdepartments:     string[];
  functions:          string[];
  intentStrength:     string | null;
  showIntent:         boolean | null;
  revealedForTeam:    boolean;

  // Employment
  employmentHistory:  any[];

  // Organisation
  organization: {
    id:                     string | null;
    name:                   string | null;
    websiteUrl:             string | null;
    linkedinUrl:            string | null;
    twitterUrl:             string | null;
    facebookUrl:            string | null;
    logoUrl:                string | null;
    primaryDomain:          string | null;
    primaryPhone:           string | null;
    city:                   string | null;
    state:                  string | null;
    country:                string | null;
    postalCode:             string | null;
    streetAddress:          string | null;
    rawAddress:             string | null;
    industry:               string | null;
    industries:             string[];
    secondaryIndustries:    string[];
    keywords:               string[];
    shortDescription:       string | null;
    estimatedEmployees:     number | null;
    annualRevenue:          number | null;
    annualRevenuePrinted:   string | null;
    totalFunding:           number | null;
    totalFundingPrinted:    string | null;
    foundedYear:            number | null;
    alexaRanking:           number | null;
    publiclyTradedSymbol:   string | null;
    publiclyTradedExchange: string | null;
    sicCodes:               string[];
    naicsCodes:             string[];
    technologies:           any[];
    technologyNames:        string[];
    fundingEvents:          any[];
    latestFundingStage:     string | null;
    latestFundingRoundDate: string | null;
  };

  // Raw
  rawPerson:       any;
  rawOrganization: any;
  rawContact:      any;
  fullRaw:         any;

  // Metadata
  isEnriched: boolean;
}

// ── Safe helpers ───────────────────────────────────────────────────────────────

/** Safely read a dot-path from any object */
export const safeGet = (obj: any, path: string, defaultValue: any = null): any => {
  try {
    return path.split('.').reduce((acc, part) => acc?.[part], obj) ?? defaultValue;
  } catch {
    return defaultValue;
  }
};

/** Returns true when a value has useful content (non-empty array, non-null scalar) */
export const hasData = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
};

/** Format a date string to a readable format */
export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

// ── Main extractor ─────────────────────────────────────────────────────────────

/**
 * Safely extract normalised data from a contact row that may or may not
 * have its relations (enrichment_raw_responses, enrichment_contact_emails, etc.)
 * loaded. Every array access uses `?? []` so calling this before data is
 * fully hydrated will never throw.
 */
export const extractFromRaw = (contact: any): ExtractedData => {
  // Guard: return empty skeleton if contact is nullish
  if (!contact) return buildEmpty();

  // ── Raw response ─────────────────────────────────────────────────────────
  const rawResponses = Array.isArray(contact.enrichment_raw_responses)
    ? contact.enrichment_raw_responses
    : [];
  const rawResponse  = rawResponses[0]?.raw_json ?? null;
  const person       = rawResponse?.person        ?? {};
  const org          = person?.organization       ?? {};
  const contactData  = person?.contact            ?? {};

  const isEnriched = Boolean(rawResponse && Object.keys(person).length > 0);

  // ── Emails ───────────────────────────────────────────────────────────────
  // Source 1: raw Apollo response
  const rawEmails: any[] = Array.isArray(person?.contact?.email_addresses)
    ? person.contact.email_addresses
    : [];

  // Source 2: enrichment_contact_emails table — SAFELY guard the array
  const tableEmails: any[] = Array.isArray(contact.enrichment_contact_emails)
    ? contact.enrichment_contact_emails
    : [];

  // Source 3: primary email on contacts row
  const primaryEmailRow = contact.email ?? null;

  // Merge — deduplicate by email address
  const emailMap = new Map<string, { email: string; status?: string; source?: string; type?: string }>();

  if (primaryEmailRow) {
    emailMap.set(primaryEmailRow.toLowerCase(), {
      email:  primaryEmailRow,
      status: contact.email_status ?? 'unverified',
      source: 'CRM',
      type:   'work',
    });
  }

  for (const e of rawEmails) {
    const addr = (e.email ?? '').toLowerCase();
    if (addr && !emailMap.has(addr)) {
      emailMap.set(addr, {
        email:  e.email,
        status: e.email_status ?? e.status ?? null,
        source: 'enrichment',
        type:   e.type ?? null,
      });
    }
  }

  for (const e of tableEmails) {
    const addr = (e.email ?? '').toLowerCase();
    if (addr && !emailMap.has(addr)) {
      emailMap.set(addr, {
        email:  e.email,
        status: e.email_status ?? e.status ?? null,
        source: e.source ?? 'enrichment',
        type:   e.email_type ?? e.type ?? null,
      });
    }
  }

  const allEmails      = [...emailMap.values()];
  const primaryEmail   = allEmails[0]?.email   ?? primaryEmailRow;
  const emailStatus    = allEmails[0]?.status   ?? null;

  // ── Phones ───────────────────────────────────────────────────────────────
  // Source 1: raw Apollo response
  const rawPhones: any[] = Array.isArray(person?.contact?.phone_numbers)
    ? person.contact.phone_numbers
    : [];

  // Source 2: enrichment_contact_phones table — SAFELY guard the array
  const tablePhones: any[] = Array.isArray(contact.enrichment_contact_phones)
    ? contact.enrichment_contact_phones
    : [];

  // Source 3: mobile on contacts row
  const primaryMobile = contact.mobile ?? null;

  // Merge — deduplicate by normalised number
  const phoneMap = new Map<string, any>();

  if (primaryMobile) {
    phoneMap.set(primaryMobile, {
      phone_number: primaryMobile,
      raw_number:   primaryMobile,
      type:         'mobile',
      status:       'valid_number',
      source_name:  'CRM',
      is_primary:   true,
    });
  }

  for (const p of rawPhones) {
    const num = p.sanitized_number ?? p.number ?? '';
    if (num && !phoneMap.has(num)) {
      phoneMap.set(num, {
        phone_number: num,
        raw_number:   p.raw_number ?? num,
        type:         p.type ?? null,
        status:       p.status ?? null,
        source_name:  'enrichment',
        is_primary:   false,
      });
    }
  }

  for (const p of tablePhones) {
    const num = p.phone_number ?? p.raw_number ?? '';
    if (num && !phoneMap.has(num)) {
      phoneMap.set(num, {
        phone_number: num,
        raw_number:   p.raw_number ?? num,
        type:         p.type ?? p.phone_type ?? null,
        status:       p.status ?? p.validity ?? null,
        source_name:  p.source_name ?? p.source ?? 'enrichment',
        is_primary:   p.is_primary ?? false,
      });
    }
  }

  const phoneNumbers    = [...phoneMap.values()];
  const primaryPhone    = phoneNumbers[0]?.phone_number ?? primaryMobile;
  const hasDirectPhone  = phoneNumbers.some(p => p.type === 'direct' || p.type === 'work_hq');
  const directDialStatus = phoneNumbers.find(p => p.type === 'direct')?.status ?? null;

  // ── Enrichment people row ─────────────────────────────────────────────────
  const enrichmentPeople: any[] = Array.isArray(contact.enrichment_people)
    ? contact.enrichment_people
    : [];
  const enrichPerson = enrichmentPeople[0] ?? {};

  // ── Metadata ──────────────────────────────────────────────────────────────
  const metadataRows: any[] = Array.isArray(enrichPerson.enrichment_person_metadata)
    ? enrichPerson.enrichment_person_metadata
    : [];
  const metadata = metadataRows[0] ?? {};

  const departments    = (person.departments    ?? metadata.departments    ?? []) as string[];
  const subdepartments = (person.subdepartments ?? metadata.subdepartments ?? []) as string[];
  const functions_     = (person.functions      ?? metadata.functions      ?? []) as string[];
  const seniority      = person.seniority       ?? metadata.seniority       ?? enrichPerson.seniority ?? null;

  // ── Employment history ────────────────────────────────────────────────────
  const rawHistory: any[]   = Array.isArray(person.employment_history) ? person.employment_history : [];
  const tableHistory: any[] = Array.isArray(enrichPerson.enrichment_employment_history)
    ? enrichPerson.enrichment_employment_history
    : [];
  const employmentHistory   = rawHistory.length > 0 ? rawHistory : tableHistory;

  // ── Location ──────────────────────────────────────────────────────────────
  const city    = person.city    ?? enrichPerson.city    ?? contact.city    ?? null;
  const state   = person.state   ?? enrichPerson.state   ?? contact.state   ?? null;
  const country = person.country ?? enrichPerson.country ?? contact.country ?? null;

  // ── Social ────────────────────────────────────────────────────────────────
  const linkedinUrl = person.linkedin_url ?? enrichPerson.linkedin_url ?? contact.linkedin_url ?? null;
  const twitterUrl  = person.twitter_url  ?? contact.twitter_url  ?? null;
  const facebookUrl = person.facebook_url ?? contact.facebook_url ?? null;
  const githubUrl   = person.github_url   ?? contact.github_url   ?? null;

  // ── Photo ─────────────────────────────────────────────────────────────────
  const photoUrl = person.photo_url ?? person.profile_photo_url
    ?? enrichPerson.photo_url
    ?? contact.photo_url
    ?? null;

  // ── Organisation ─────────────────────────────────────────────────────────
  const enrichOrgs: any[] = Array.isArray(enrichPerson.enrichment_organizations)
    ? enrichPerson.enrichment_organizations
    : [];
  const enrichOrg = enrichOrgs[0] ?? {};

  return {
    firstName:       person.first_name ?? null,
    lastName:        person.last_name  ?? null,
    fullName: person.name ?? (`${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || contact.name) ?? null,
    headline:        person.headline ?? null,
    photoUrl,
    title:           person.title ?? enrichPerson.title ?? contact.job_title ?? null,
    seniority,

    primaryEmail,
    emailStatus,
    allEmails,

    primaryPhone,
    phoneNumbers,
    hasDirectPhone,
    directDialStatus,

    city,
    state,
    country,
    postalCode:      person.postal_code ?? contact.postal_code ?? null,
    timezone:        person.time_zone   ?? metadata.time_zone  ?? contact.timezone ?? null,
    formattedAddress:person.formatted_address ?? null,

    linkedinUrl,
    twitterUrl,
    facebookUrl,
    githubUrl,

    departments,
    subdepartments,
    functions:      functions_,
    intentStrength: person.intent_strength ?? null,
    showIntent:     person.show_intent     ?? null,
    revealedForTeam:person.revealed_for_current_team ?? false,

    employmentHistory,

    organization: {
      id:                     org.id                       ?? null,
      name:                   org.name                     ?? contact.company_name ?? contact.companies?.name ?? null,
      websiteUrl:             org.website_url              ?? contact.companies?.website ?? null,
      linkedinUrl:            org.linkedin_url             ?? enrichOrg.linkedin_url ?? null,
      twitterUrl:             org.twitter_url              ?? null,
      facebookUrl:            org.facebook_url             ?? null,
      logoUrl:                org.logo_url                 ?? contact.companies?.logo_url ?? null,
      primaryDomain:          org.primary_domain           ?? null,
      primaryPhone:           org.primary_phone?.number    ?? enrichOrg.primary_phone ?? null,
      city:                   org.city                     ?? enrichOrg.city   ?? null,
      state:                  org.state                    ?? enrichOrg.state  ?? null,
      country:                org.country                  ?? enrichOrg.country ?? null,
      postalCode:             org.postal_code              ?? null,
      streetAddress:          org.street_address           ?? null,
      rawAddress:             org.raw_address              ?? enrichOrg.raw_address ?? null,
      industry:               org.industry                 ?? enrichOrg.industry ?? contact.companies?.industry ?? null,
      industries:             (org.industries              ?? enrichOrg.industries              ?? []) as string[],
      secondaryIndustries:    (org.secondary_industries    ?? []) as string[],
      keywords:               (org.keywords                ?? []) as string[],
      shortDescription:       org.short_description        ?? enrichOrg.short_description ?? null,
      estimatedEmployees:     org.estimated_num_employees  ?? enrichOrg.estimated_num_employees ?? null,
      annualRevenue:          org.annual_revenue           ?? null,
      annualRevenuePrinted:   org.annual_revenue_printed   ?? enrichOrg.annual_revenue_printed ?? null,
      totalFunding:           org.total_funding            ?? null,
      totalFundingPrinted:    org.total_funding_printed    ?? enrichOrg.total_funding_printed ?? null,
      foundedYear:            org.founded_year             ?? enrichOrg.founded_year ?? null,
      alexaRanking:           org.alexa_ranking            ?? null,
      publiclyTradedSymbol:   org.publicly_traded_symbol   ?? enrichOrg.publicly_traded_symbol ?? null,
      publiclyTradedExchange: org.publicly_traded_exchange ?? enrichOrg.publicly_traded_exchange ?? null,
      sicCodes:               (org.sic_codes               ?? enrichOrg.sic_codes               ?? []) as string[],
      naicsCodes:             (org.naics_codes             ?? enrichOrg.naics_codes             ?? []) as string[],
      technologies:           (org.current_technologies    ?? enrichOrg.enrichment_org_technologies ?? []) as any[],
      technologyNames:        (org.technology_names        ?? []) as string[],
      fundingEvents:          (org.funding_events          ?? enrichOrg.enrichment_org_funding_events ?? []) as any[],
      latestFundingStage:     org.latest_funding_stage     ?? enrichOrg.latest_funding_stage ?? null,
      latestFundingRoundDate: org.latest_funding_round_date ?? enrichOrg.latest_funding_round_date ?? null,
    },

    rawPerson:       person,
    rawOrganization: org,
    rawContact:      contactData,
    fullRaw:         rawResponse,

    isEnriched,
  };
};

// ── Empty skeleton (returned when contact is null/undefined) ──────────────────

function buildEmpty(): ExtractedData {
  return {
    firstName: null, lastName: null, fullName: null, headline: null,
    photoUrl: null, title: null, seniority: null,
    primaryEmail: null, emailStatus: null, allEmails: [],
    primaryPhone: null, phoneNumbers: [], hasDirectPhone: false, directDialStatus: null,
    city: null, state: null, country: null, postalCode: null,
    timezone: null, formattedAddress: null,
    linkedinUrl: null, twitterUrl: null, facebookUrl: null, githubUrl: null,
    departments: [], subdepartments: [], functions: [],
    intentStrength: null, showIntent: null, revealedForTeam: false,
    employmentHistory: [],
    organization: {
      id: null, name: null, websiteUrl: null, linkedinUrl: null, twitterUrl: null,
      facebookUrl: null, logoUrl: null, primaryDomain: null, primaryPhone: null,
      city: null, state: null, country: null, postalCode: null,
      streetAddress: null, rawAddress: null, industry: null,
      industries: [], secondaryIndustries: [], keywords: [], shortDescription: null,
      estimatedEmployees: null, annualRevenue: null, annualRevenuePrinted: null,
      totalFunding: null, totalFundingPrinted: null, foundedYear: null,
      alexaRanking: null, publiclyTradedSymbol: null, publiclyTradedExchange: null,
      sicCodes: [], naicsCodes: [], technologies: [], technologyNames: [],
      fundingEvents: [], latestFundingStage: null, latestFundingRoundDate: null,
    },
    rawPerson: {}, rawOrganization: {}, rawContact: {}, fullRaw: null,
    isEnriched: false,
  };
}