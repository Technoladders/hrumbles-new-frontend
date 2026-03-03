// src/services/integrationService.ts
// Supabase CRUD layer for hr_job_board_integrations

import { supabase } from "@/integrations/supabase/client";

export type JobBoardProvider = "careerjet" | "indeed" | "linkedin" | "naukri" | "shine";

export interface JobBoardIntegration {
  id: string;
  organization_id: string;
  provider: JobBoardProvider;
  api_key: string | null;
  api_secret: string | null;
  is_active: boolean;
  config: Record<string, any>;
  last_synced_at: string | null;
  synced_jobs_count: number;
  created_at: string;
  updated_at: string;
}

export interface UpsertIntegrationPayload {
  provider: JobBoardProvider;
  api_key?: string;
  api_secret?: string;
  is_active?: boolean;
  config?: Record<string, any>;
}

// ── Fetch all integrations for an org ────────────────────────────────────────
export const getIntegrationsByOrg = async (
  organizationId: string
): Promise<JobBoardIntegration[]> => {
  const { data, error } = await supabase
    .from("hr_job_board_integrations")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
};

// ── Fetch a single integration ────────────────────────────────────────────────
export const getIntegration = async (
  organizationId: string,
  provider: JobBoardProvider
): Promise<JobBoardIntegration | null> => {
  const { data, error } = await supabase
    .from("hr_job_board_integrations")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) throw error;
  return data;
};

// ── Create or update an integration ──────────────────────────────────────────
export const upsertIntegration = async (
  organizationId: string,
  payload: UpsertIntegrationPayload
): Promise<JobBoardIntegration> => {
  const { data, error } = await supabase
    .from("hr_job_board_integrations")
    .upsert(
      {
        organization_id: organizationId,
        provider: payload.provider,
        api_key: payload.api_key ?? null,
        api_secret: payload.api_secret ?? null,
        is_active: payload.is_active ?? false,
        config: payload.config ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,provider" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ── Toggle active status ──────────────────────────────────────────────────────
export const toggleIntegrationActive = async (
  id: string,
  is_active: boolean
): Promise<void> => {
  const { error } = await supabase
    .from("hr_job_board_integrations")
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
};

// ── Delete an integration ─────────────────────────────────────────────────────
export const deleteIntegration = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("hr_job_board_integrations")
    .delete()
    .eq("id", id);

  if (error) throw error;
};

// ── Record a sync event ───────────────────────────────────────────────────────
export const recordSync = async (
  id: string,
  jobCount: number
): Promise<void> => {
  const { error } = await supabase
    .from("hr_job_board_integrations")
    .update({
      last_synced_at: new Date().toISOString(),
      synced_jobs_count: jobCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
};

// ── Generate the XML Feed URL for an org ─────────────────────────────────────
// CareerJet will hit this URL to pull the org's jobs as XML.
// The Supabase edge function reads org jobs and outputs valid XML.
export const getXmlFeedUrl = (subdomain: string): string => {
  const baseUrl =
    import.meta.env.VITE_SUPABASE_URL ||
    "https://your-project.supabase.co";
  return `${baseUrl}/functions/v1/careerjet-xml-feed?org=${subdomain}`;
};

// ── Build CareerJet Search API URL (server-side proxy recommended) ────────────
// Frontend triggers this via a Supabase edge function to avoid CORS + key exposure
export const buildCareerjetSearchUrl = (params: {
  keywords: string;
  location?: string;
  locale?: string;
  page?: number;
  pageSize?: number;
}): string => {
  const p = new URLSearchParams({
    locale_code: params.locale ?? "en_IN",
    keywords: params.keywords,
    location: params.location ?? "",
    page: String(params.page ?? 1),
    page_size: String(params.pageSize ?? 20),
    user_ip: "127.0.0.1",       // replace with real user IP on server side
    user_agent: navigator.userAgent,
  });
  return `https://search.api.careerjet.net/v4/query?${p.toString()}`;
};