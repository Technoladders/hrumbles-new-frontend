// Hrumbles-Front-End_UI/src/components/rocketreach/hooks/useRREnrichmentData.ts
// Mirrors useEnrichmentData.ts but keyed by rr_profile_id.
// 3-path loading:
//   Path 1 — candidate_reveal_cache (raw_apollo_response column = RR response)
//   Path 2 — candidate_enrichment_data (provider='rocketreach', type='full_profile')
//   Path 3 — enrichment_employment_history + enrichment_people by contact_id

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RRJobHistoryEntry, RREducationEntry, RREmailEntry, RRPhoneEntry } from "./useRRLookup";

export interface RREnrichmentData {
  // From reveal cache / enrichment_data
  name?:          string | null;
  title?:         string | null;
  company?:       string | null;
  location?:      string | null;
  linkedinUrl?:   string | null;
  profilePic?:    string | null;
  connections?:   number | null;
  skills?:        string[];
  allEmails?:     RREmailEntry[];
  allPhones?:     RRPhoneEntry[];
  // From enrichment tables (contact_id path)
  jobHistory?:    RRJobHistoryEntry[];
  education?:     RREducationEntry[];
  industry?:      string | null;
  companyDomain?: string | null;
}

export function useRREnrichmentData(rrProfileId: string | number | null) {
  return useQuery<RREnrichmentData | null>({
    queryKey: ["rr-enrichment-data", String(rrProfileId)],
    enabled:  !!rrProfileId,
    staleTime: 5 * 60 * 1000,

    queryFn: async (): Promise<RREnrichmentData | null> => {
      const rrIdStr = String(rrProfileId);

      // ── Path 1: candidate_reveal_cache ─────────────────────────────────────
      const { data: cacheRow } = await supabase
        .from("candidate_reveal_cache")
        .select("*")
        .eq("rr_profile_id", rrIdStr)
        .maybeSingle();

      if (cacheRow?.raw_apollo_response) {
        const raw = cacheRow.raw_apollo_response as any;
        return {
          name:         raw.name         ?? cacheRow.snapshot_name,
          title:        raw.current_title ?? cacheRow.snapshot_title,
          company:      raw.current_employer ?? cacheRow.snapshot_company,
          location:     raw.location     ?? cacheRow.snapshot_location,
          linkedinUrl:  raw.linkedin_url,
          profilePic:   raw.profile_pic,
          connections:  raw.connections,
          skills:       raw.skills        ?? [],
          allEmails:    cacheRow.all_emails ?? [],
          allPhones:    cacheRow.all_phones ?? [],
          jobHistory:   raw.job_history   ?? [],
          education:    raw.education     ?? [],
          industry:     raw.current_employer_industry,
          companyDomain: raw.current_employer_domain,
        };
      }

      // ── Path 2: candidate_enrichment_data ──────────────────────────────────
      // Need candidate_profile_id first via provider_ids
      const { data: providerRow } = await supabase
        .from("candidate_provider_ids")
        .select("candidate_profile_id")
        .eq("provider", "rocketreach")
        .eq("provider_person_id", rrIdStr)
        .maybeSingle();

      if (providerRow?.candidate_profile_id) {
        const { data: enrichRow } = await supabase
          .from("candidate_enrichment_data")
          .select("data")
          .eq("candidate_profile_id", providerRow.candidate_profile_id)
          .eq("provider", "rocketreach")
          .eq("enrichment_type", "full_profile")
          .maybeSingle();

        if (enrichRow?.data) {
          const raw = enrichRow.data as any;
          return {
            name:         raw.name,
            title:        raw.current_title,
            company:      raw.current_employer,
            location:     raw.location,
            linkedinUrl:  raw.linkedin_url,
            profilePic:   raw.profile_pic,
            connections:  raw.connections,
            skills:       raw.skills        ?? [],
            allEmails:    (raw.emails ?? []).map((e: any) => ({
              email: e.email, type: e.type, grade: e.grade,
              smtp_valid: e.smtp_valid, source: "rocketreach_lookup", is_primary: false,
            })),
            allPhones: (raw.phones ?? []).map((p: any) => ({
              number: p.number, type: p.type, validity: p.validity,
              recommended: p.recommended, premium: p.premium, source: "rocketreach_lookup",
            })),
            jobHistory:   raw.job_history ?? [],
            education:    raw.education   ?? [],
            industry:     raw.current_employer_industry,
            companyDomain: raw.current_employer_domain,
          };
        }
      }

      // ── Path 3: enrichment tables by contact rocketreach_id ────────────────
      const { data: contactRow } = await supabase
        .from("contacts")
        .select("id, name, job_title, photo_url, linkedin_url")
        .eq("rocketreach_id", rrIdStr)
        .maybeSingle();

      if (contactRow) {
        const contactId = contactRow.id;

        const [{ data: empHistory }, { data: metadata }, { data: emails }, { data: phones }] =
          await Promise.all([
            supabase
              .from("enrichment_employment_history")
              .select("*")
              .eq("contact_id", contactId)
              .eq("source", "rocketreach")
              .order("start_date", { ascending: false }),
            supabase
              .from("enrichment_person_metadata")
              .select("*")
              .eq("contact_id", contactId)
              .eq("source", "rocketreach")
              .maybeSingle(),
            supabase
              .from("enrichment_contact_emails")
              .select("*")
              .eq("contact_id", contactId)
              .eq("source", "rocketreach_lookup"),
            supabase
              .from("enrichment_contact_phones")
              .select("*")
              .eq("contact_id", contactId)
              .eq("source", "rocketreach_lookup"),
          ]);

        return {
          name:         contactRow.name,
          title:        contactRow.title,
          company:      null,
          location:     contactRow.location,
          linkedinUrl:  contactRow.linkedin_url,
          profilePic:   contactRow.photo_url,
          connections:  null,
          skills:       [],
          allEmails: (emails ?? []).map((e: any, i: number) => ({
            email: e.email, type: e.email_type, grade: e.grade,
            smtp_valid: e.smtp_valid, source: e.source, is_primary: i === 0,
          })),
          allPhones: (phones ?? []).map((p: any) => ({
            number: p.phone_number, type: p.phone_type, validity: p.validity,
            recommended: p.is_recommended, premium: p.is_premium, source: p.source,
          })),
          jobHistory: (empHistory ?? []).map((h: any) => ({
            title:        h.title,
            company_name: h.organization_name,
            department:   h.department,
            start_date:   h.start_date,
            end_date:     h.end_date,
            is_current:   h.is_current,
            description:  h.description,
            company_linkedin_url: h.company_linkedin_url,
          })),
          education:    [],
          industry:     (metadata as any)?.industry,
          companyDomain: (metadata as any)?.company_domain,
        };
      }

      return null;
    },
  });
}