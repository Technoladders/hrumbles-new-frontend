// src/hooks/useCareerJet.ts
// ─────────────────────────────────────────────────────────────────────────────
// React hook for all CareerJet API operations via the careerjet-proxy edge fn.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CareerJetJob {
  title:                 string;
  company:               string;
  date:                  string;
  description:           string;
  locations:             string;
  salary:                string;
  salary_currency_code?: string;
  salary_min?:           number;
  salary_max?:           number;
  salary_type?:          string;
  site:                  string;
  url:                   string;
}

export interface CareerJetSearchResult {
  type:          string;
  hits:          number;
  message:       string;
  pages:         number;
  response_time: number;
  jobs:          CareerJetJob[];
}

export interface CareerJetSite {
  id:     string;
  handle: string;
  object: string;
}

export interface CareerJetClick {
  id:             string;
  click_datetime: string;
  url:            string;
  timezone:       string;
  cost:           number;
  currency:       string;
  client_ref:     string;
  object:         string;
}

export interface FeedTestResult {
  success:     boolean;
  feed_url:    string;
  job_count:   number;
  is_valid:    boolean;
  preview:     Array<{ id: string; title: string; location: string; contract: string }>;
  raw_snippet: string;
  error?:      string;
  detail?:     string;
}

export interface WebhookTestResult {
  success:     boolean;
  webhook_url: string;
  http_status: number;
  response:    { status: string };
  test_job:    { id: string; title: string };
  test_email:  string;
  error?:      string;
}

// ── Proxy caller ──────────────────────────────────────────────────────────────

async function callProxy(payload: Record<string, unknown>): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;

  const response = await fetch(
    `${supabaseUrl}/functions/v1/careerjet-proxy`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        ...payload,
        user_ip:    "1.1.1.1",          // In prod, get real IP server-side
        user_agent: navigator.userAgent,
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? `Proxy error ${response.status}`);
  }
  return data;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCareerJet(subdomain: string | undefined) {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors,  setErrors]  = useState<Record<string, string | null>>({});

  const setOp = (op: string, isLoading: boolean, error: string | null = null) => {
    setLoading((p) => ({ ...p, [op]: isLoading }));
    setErrors((p)  => ({ ...p, [op]: error }));
  };

  // ── Search jobs on CareerJet ───────────────────────────────────────────────
  const searchJobs = useCallback(async (params: {
    keywords:      string;
    location?:     string;
    page?:         number;
    page_size?:    number;
    sort?:         "relevance" | "date" | "salary";
    contract_type?: string;
    work_hours?:   string;
  }): Promise<CareerJetSearchResult | null> => {
    if (!subdomain) return null;
    setOp("search", true);
    try {
      const res = await callProxy({ action: "search", org: subdomain, ...params });
      setOp("search", false);
      return res.data as CareerJetSearchResult;
    } catch (err: any) {
      setOp("search", false, err.message);
      return null;
    }
  }, [subdomain]);

  // ── List managed CareerJet sites ───────────────────────────────────────────
  const getSites = useCallback(async (): Promise<CareerJetSite[]> => {
    if (!subdomain) return [];
    setOp("sites", true);
    try {
      const res = await callProxy({ action: "sites", org: subdomain });
      setOp("sites", false);
      if (!res.success) throw new Error(res.error);
      return res.data?.data ?? [];
    } catch (err: any) {
      setOp("sites", false, err.message);
      return [];
    }
  }, [subdomain]);

  // ── Get clicks for a site ──────────────────────────────────────────────────
  const getClicks = useCallback(async (params: {
    site_id:              string;
    offset?:              number;
    limit?:               number;
    click_datetime_from?: string;
    click_datetime_to?:   string;
  }): Promise<{ data: CareerJetClick[]; has_more: boolean }> => {
    if (!subdomain) return { data: [], has_more: false };
    setOp("clicks", true);
    try {
      const res = await callProxy({ action: "clicks", org: subdomain, ...params });
      setOp("clicks", false);
      if (!res.success) throw new Error(res.error);
      return { data: res.data?.data ?? [], has_more: res.data?.has_more ?? false };
    } catch (err: any) {
      setOp("clicks", false, err.message);
      return { data: [], has_more: false };
    }
  }, [subdomain]);

  // ── Test XML feed ──────────────────────────────────────────────────────────
  const testFeed = useCallback(async (): Promise<FeedTestResult | null> => {
    if (!subdomain) return null;
    setOp("test_feed", true);
    try {
      const res = await callProxy({ action: "test_feed", org: subdomain });
      setOp("test_feed", false);
      return res as FeedTestResult;
    } catch (err: any) {
      setOp("test_feed", false, err.message);
      return null;
    }
  }, [subdomain]);

  // ── Test apply webhook ─────────────────────────────────────────────────────
  const testWebhook = useCallback(async (): Promise<WebhookTestResult | null> => {
    if (!subdomain) return null;
    setOp("test_webhook", true);
    try {
      const res = await callProxy({ action: "test_webhook", org: subdomain });
      setOp("test_webhook", false);
      return res as WebhookTestResult;
    } catch (err: any) {
      setOp("test_webhook", false, err.message);
      return null;
    }
  }, [subdomain]);

  return {
    searchJobs,
    getSites,
    getClicks,
    testFeed,
    testWebhook,
    loading,
    errors,
  };
}