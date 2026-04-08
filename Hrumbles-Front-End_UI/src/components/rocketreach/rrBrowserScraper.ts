/**
 * rrBrowserScraper.ts
 *
 * Scrapes RocketReach public profiles DIRECTLY from the browser
 * (bypasses Cloudflare since it's a real browser request).
 *
 * Flow:
 *   1. Fetch RocketReach profile HTML via a CORS proxy
 *   2. Parse the HTML in-browser using DOMParser
 *   3. Save result to Supabase cache (rr_profile_cache table)
 *   4. Return structured profile JSON
 *
 * Usage:
 *   import { scrapeRRProfiles } from "@/components/rocketreach/rrBrowserScraper";
 *   const results = await scrapeRRProfiles(supabase, [{ id: 81003596, name: "Balajee Ramachandran" }]);
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Config ───────────────────────────────────────────────────────────────────

// CORS proxy options (pick one or self-host):
//   Option A: corsproxy.io  — free, no signup  → "https://corsproxy.io/?"
//   Option B: allorigins    — free, no signup  → "https://api.allorigins.win/raw?url="
//   Option C: Your own      — deploy a tiny Cloudflare Worker (recommended for prod)
const CORS_PROXY = "https://corsproxy.io/?";

// Cache TTL in days
const CACHE_TTL_DAYS = 7;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScrapedProfile {
  id:              number;
  name:            string;
  current_title:   string | null;
  current_company: string | null;
  location: {
    city:    string | null;
    state:   string | null;
    country: string | null;
  };
  emails:      Array<{ value: string; status: "available" | "gated" }>;
  phone:       string | null;
  work_history: Array<{ period: string; title: string; company: string }>;
  education:   Array<{ institution: string; degree: string | null; field: string | null; period: string | null }>;
  skills:      string[];
  source:      string;
  profile_url: string;
  scraped_at:  string;
  cached:      boolean;
  cached_at?:  string;
}

export interface ScrapeResult {
  success: boolean;
  data?:   ScrapedProfile;
  id:      number;
  name:    string;
  error?:  string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-");
}

function buildProfileUrl(id: number, name: string): string {
  return `https://rocketreach.co/${nameToSlug(name)}-email_${id}`;
}

// ─── Cache: Read ──────────────────────────────────────────────────────────────

async function getCachedProfile(
  supabase: SupabaseClient,
  rocketreach_id: number
): Promise<ScrapedProfile | null> {
  try {
    const { data, error } = await supabase
      .from("rr_profile_cache")
      .select("*")
      .eq("rocketreach_id", rocketreach_id)
      .single();

    if (error || !data) return null;

    // TTL check
    const cachedAt  = new Date(data.cached_at);
    const expiresAt = new Date(cachedAt.getTime() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);
    if (new Date() > expiresAt) return null;

    return { ...data.profile_data, cached: true, cached_at: data.cached_at };
  } catch {
    return null;
  }
}

// ─── Cache: Write ─────────────────────────────────────────────────────────────

async function setCachedProfile(
  supabase: SupabaseClient,
  rocketreach_id: number,
  name: string,
  profile_data: ScrapedProfile
): Promise<void> {
  try {
    await supabase
      .from("rr_profile_cache")
      .upsert(
        { rocketreach_id, name, profile_data, cached_at: new Date().toISOString() },
        { onConflict: "rocketreach_id" }
      );
  } catch (err) {
    console.warn("Cache write failed:", err);
  }
}

// ─── HTML Parser ──────────────────────────────────────────────────────────────

function parseRocketReachHtml(html: string, id: number, name: string, url: string): ScrapedProfile {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(html, "text/html");

  const getText = (selector: string) =>
    doc.querySelector(selector)?.textContent?.trim() ?? null;

  const getAll = (selector: string) =>
    Array.from(doc.querySelectorAll(selector))
      .map(el => el.textContent?.trim() ?? "")
      .filter(Boolean);

  // ── Name & Title ──
  const fullName = getText("h1") ?? name;
  const title    = getText(".title, [class*='title']") ?? null;

  // ── Location ──
  const locationRaw = getText(".location, [class*='location']");
  let location = { city: null as string | null, state: null as string | null, country: null as string | null };
  if (locationRaw) {
    const parts = locationRaw.split(",").map(p => p.trim());
    location = { city: parts[0] ?? null, state: parts[1] ?? null, country: parts[2] ?? null };
  }

  // ── Emails ──
  const bodyText   = doc.body?.textContent ?? "";
  const emailNodes = getAll("[class*='email'], a[href^='mailto']");
  const emails     = emailNodes
    .filter(e => e.includes("@") || e.includes("*"))
    .map(e => ({ value: e, status: (e.includes("*") ? "gated" : "available") as "available" | "gated" }));

  // Also extract email domains from raw HTML
  const domainMatches = html.match(/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
  const emailDomains  = [...new Set(
    domainMatches.filter(d => !d.includes("rocketreach") && !d.includes("w3.org") && !d.includes("schema"))
  )];

  // ── Work History ──
  const workHistory: ScrapedProfile["work_history"] = [];
  const workRegex = /(\d{4}\s*[-–]\s*(?:\d{4}|now|present))\s+(.+?)\s+at\s+(.+?)(?=\d{4}|$)/gi;
  let wm: RegExpExecArray | null;
  while ((wm = workRegex.exec(bodyText)) !== null) {
    workHistory.push({
      period:  wm[1].trim(),
      title:   wm[2].trim(),
      company: wm[3].trim().split("\n")[0].trim(),
    });
  }

  // ── Education ──
  const education: ScrapedProfile["education"] = [];
  const eduRegex = /([A-Z][^\n]+(?:University|Institute|College|Academy|School|Technology)[^\n]*)\s*\n?\s*(Bachelor|Master|MBA|PhD|BTech|MTech|BE|ME|BSc|MSc|B\.Tech|M\.Tech)?[^\n]*\n?\s*(\d{4}\s*[-–]\s*\d{4})?/gi;
  let em: RegExpExecArray | null;
  while ((em = eduRegex.exec(bodyText)) !== null) {
    education.push({
      institution: em[1].trim(),
      degree:      em[2]?.trim() ?? null,
      field:       null,
      period:      em[3]?.trim() ?? null,
    });
  }

  // ── Skills ──
  const skillItems   = getAll("[class*='skill'] li, [class*='skill'] span, [class*='tag']");
  const skillSection = bodyText.match(/Skills?\s*\n([\s\S]*?)(?:\n\n)/i);
  const skills       = (skillSection
    ? skillSection[1].split("\n").map(s => s.trim()).filter(s => s.length > 1 && s.length < 50)
    : skillItems
  ).slice(0, 20);

  return {
    id,
    name:            fullName,
    current_title:   title,
    current_company: workHistory[0]?.company ?? null,
    location,
    emails:          emails.length > 0 ? emails : emailDomains.map(d => ({ value: d, status: "gated" as const })),
    phone:           null,
    work_history:    workHistory,
    education,
    skills,
    source:          "RocketReach",
    profile_url:     url,
    scraped_at:      new Date().toISOString(),
    cached:          false,
  };
}

// ─── Single profile scrape ────────────────────────────────────────────────────

async function scrapeSingleProfile(
  supabase: SupabaseClient,
  id: number,
  name: string,
  forceRefresh = false
): Promise<ScrapeResult> {
  // 1. Check cache
  if (!forceRefresh) {
    const cached = await getCachedProfile(supabase, id);
    if (cached) return { success: true, data: cached, id, name };
  }

  const url = buildProfileUrl(id, name);

  try {
    // 2. Fetch via CORS proxy (runs in browser → Cloudflare allows it)
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
    const res      = await fetch(proxyUrl, {
      headers: {
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html    = await res.text();
    const profile = parseRocketReachHtml(html, id, name, url);

    // 3. Save to cache
    await setCachedProfile(supabase, id, name, profile);

    return { success: true, data: profile, id, name };
  } catch (err) {
    console.error(`Failed to scrape ${id} (${name}):`, err);
    return {
      success: false,
      id,
      name,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── Batch scrape (main export) ───────────────────────────────────────────────

/**
 * Scrape multiple RocketReach profiles from the browser.
 * Checks cache first, only scrapes what's missing.
 * Rate-limited to avoid hammering RocketReach (300ms between requests).
 */
export async function scrapeRRProfiles(
  supabase: SupabaseClient,
  profiles: Array<{ id: number; name: string }>,
  options?: { forceRefresh?: boolean; onProgress?: (result: ScrapeResult) => void }
): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  for (const profile of profiles) {
    const result = await scrapeSingleProfile(
      supabase,
      profile.id,
      profile.name,
      options?.forceRefresh ?? false
    );

    results.push(result);
    options?.onProgress?.(result);

    // Rate limit: 300ms between requests (only for live scrapes, not cache hits)
    if (!result.data?.cached) {
      await delay(300);
    }
  }

  return results;
}
