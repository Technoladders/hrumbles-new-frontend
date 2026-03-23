/**
 * useEnrichmentData.ts
 *
 * Loads rich profile data for a candidate by apollo_person_id.
 *
 * Sources (in order of preference):
 *   1. candidate_reveal_cache.raw_apollo_response — full Apollo person object,
 *      available immediately after any reveal. Primary source.
 *   2. enrichment_people + enrichment_employment_history +
 *      enrichment_person_metadata + enrichment_organizations —
 *      populated when the person also exists in the contacts table.
 *
 * Returns a normalised EnrichmentData shape that components render from.
 * Null means data not yet enriched for this person.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EmploymentEntry {
  id:               string;
  organizationName: string | null;
  title:            string | null;
  isCurrent:        boolean;
  startDate:        string | null;
  endDate:          string | null;
}

export interface EnrichmentData {
  // Identity
  fullName:       string | null;
  firstName:      string | null;
  lastName:       string | null;
  headline:       string | null;
  photoUrl:       string | null;

  // Location
  city:           string | null;
  state:          string | null;
  country:        string | null;

  // Social
  linkedinUrl:    string | null;
  twitterUrl:     string | null;
  githubUrl:      string | null;

  // Seniority & function
  seniority:      string | null;
  departments:    string[];
  subdepartments: string[];
  functions:      string[];

  // Career
  employmentHistory: EmploymentEntry[];

  // Current organisation
  orgName:            string | null;
  orgIndustry:        string | null;
  orgHeadcount:       number | null;
  orgWebsite:         string | null;
  orgLinkedin:        string | null;
  orgFounded:         number | null;
  orgAnnualRevenue:   string | null;      // printed string e.g. "100M"
  orgTotalFunding:    string | null;
  orgDescription:     string | null;
  orgCity:            string | null;
  orgCountry:         string | null;
  orgTechnologies:    string[];

  // Source tracking
  fromCache:      boolean;  // true = came from raw_apollo_response
}

// ─── Parse raw Apollo person object into EnrichmentData ──────────────────────
function parseFromRaw(p: Record<string, any>): EnrichmentData {
  const org  = p.organization ?? {};
  const hist = (p.employment_history ?? []) as any[];

  return {
    fullName:    p.name         || null,
    firstName:   p.first_name   || null,
    lastName:    p.last_name    || null,
    headline:    p.headline     || null,
    photoUrl:    p.photo_url    || null,
    city:        p.city         || null,
    state:       p.state        || null,
    country:     p.country      || null,
    linkedinUrl: p.linkedin_url || null,
    twitterUrl:  p.twitter_url  || null,
    githubUrl:   p.github_url   || null,
    seniority:   p.seniority    || null,
    departments:    Array.isArray(p.departments)    ? p.departments    : [],
    subdepartments: Array.isArray(p.subdepartments) ? p.subdepartments : [],
    functions:      Array.isArray(p.functions)      ? p.functions      : [],

    employmentHistory: hist.map((h: any) => ({
      id:               h.id || h._id || String(Math.random()),
      organizationName: h.organization_name || null,
      title:            h.title || null,
      isCurrent:        !!h.current,
      startDate:        h.start_date || null,
      endDate:          h.end_date   || null,
    })),

    orgName:          org.name             || null,
    orgIndustry:      org.industry         || null,
    orgHeadcount:     org.estimated_num_employees || null,
    orgWebsite:       org.website_url      || null,
    orgLinkedin:      org.linkedin_url     || null,
    orgFounded:       org.founded_year     || null,
    orgAnnualRevenue: org.annual_revenue_printed || null,
    orgTotalFunding:  org.total_funding_printed  || null,
    orgDescription:   org.short_description || org.seo_description || null,
    orgCity:          org.city             || null,
    orgCountry:       org.country          || null,
    orgTechnologies:  (org.current_technologies ?? []).map((t: any) => t.name).filter(Boolean),

    fromCache: true,
  };
}

// ─── Main hook ────────────────────────────────────────────────────────────────
export function useEnrichmentData(apolloPersonId: string | null | undefined) {
  return useQuery<EnrichmentData | null>({
    queryKey: ["enrichment-data", apolloPersonId],
    queryFn:  async () => {
      if (!apolloPersonId) return null;

      // ── 1. Try reveal cache (raw_apollo_response) ────────────────────────
      const { data: cacheRow } = await supabase
        .from("candidate_reveal_cache")
        .select("raw_apollo_response, snapshot_name, snapshot_title, snapshot_company, snapshot_location")
        .eq("apollo_person_id", apolloPersonId)
        .maybeSingle();

      if (cacheRow?.raw_apollo_response?.person) {
        return parseFromRaw(cacheRow.raw_apollo_response.person);
      }

      // ── 1.5. Try enrichment_raw_responses (populated by enrich-contact + reveal) ──
      // enrichment_raw_responses.raw_json has the full Apollo response keyed by contact_id.
      // We find the contact by apollo_person_id, then fetch the raw response.
      const { data: contactRow } = await supabase
        .from("contacts")
        .select("id")
        .eq("apollo_person_id", apolloPersonId)
        .limit(1)
        .maybeSingle();

      if (contactRow?.id) {
        const { data: rawRow } = await supabase
          .from("enrichment_raw_responses")
          .select("raw_json")
          .eq("contact_id", contactRow.id)
          .maybeSingle();

        if (rawRow?.raw_json?.person) {
          return parseFromRaw(rawRow.raw_json.person);
        }
      }

      // ── 2. Try enrichment tables (person was in contacts) ─────────────────
      const [personRes, histRes, metaRes] = await Promise.all([
        supabase.from("enrichment_people")
          .select("*")
          .eq("apollo_person_id", apolloPersonId)
          .maybeSingle(),
        supabase.from("enrichment_employment_history")
          .select("*")
          .eq("apollo_person_id", apolloPersonId)
          .order("start_date", { ascending: false }),
        supabase.from("enrichment_person_metadata")
          .select("*")
          .eq("apollo_person_id", apolloPersonId)
          .maybeSingle(),
      ]);

      const ep   = personRes.data;
      const hist = histRes.data ?? [];
      const meta = metaRes.data;

      if (!ep) return null;

      // Fetch org separately using apollo_org_id (not a standard FK — manual lookup)
      let org: Record<string, any> = {};
      if (ep.apollo_org_id) {
        const { data: orgRow } = await supabase
          .from("enrichment_organizations")
          .select("name,industry,estimated_num_employees,website_url,linkedin_url,founded_year,annual_revenue_printed,total_funding_printed,short_description,seo_description,city,country")
          .eq("apollo_org_id", ep.apollo_org_id)
          .maybeSingle();
        if (orgRow) org = orgRow;
      }

      return {
        fullName:    ep.full_name    || null,
        firstName:   ep.first_name   || null,
        lastName:    ep.last_name    || null,
        headline:    ep.headline     || null,
        photoUrl:    ep.photo_url    || null,
        city:        ep.city         || null,
        state:       ep.state        || null,
        country:     ep.country      || null,
        linkedinUrl: ep.linkedin_url || null,
        twitterUrl:  null,
        githubUrl:   null,
        seniority:   meta?.seniority || null,
        departments:    meta?.departments    ?? [],
        subdepartments: meta?.subdepartments ?? [],
        functions:      meta?.functions      ?? [],

        employmentHistory: hist.map((h: any) => ({
          id:               h.id,
          organizationName: h.organization_name,
          title:            h.title,
          isCurrent:        !!h.is_current,
          startDate:        h.start_date,
          endDate:          h.end_date,
        })),

        orgName:          org.name             || null,
        orgIndustry:      org.industry         || null,
        orgHeadcount:     org.estimated_num_employees || null,
        orgWebsite:       org.website_url      || null,
        orgLinkedin:      org.linkedin_url     || null,
        orgFounded:       org.founded_year     || null,
        orgAnnualRevenue: org.annual_revenue_printed || null,
        orgTotalFunding:  org.total_funding_printed  || null,
        orgDescription:   org.short_description || org.seo_description || null,
        orgCity:          org.city             || null,
        orgCountry:       org.country          || null,
        orgTechnologies:  [],

        fromCache: false,
      } as EnrichmentData;
    },
    enabled:   !!apolloPersonId,
    staleTime: 5 * 60 * 1000,
  });
}