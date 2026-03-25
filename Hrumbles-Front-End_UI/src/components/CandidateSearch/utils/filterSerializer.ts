/**
 * filterSerializer.ts — v2
 *
 * Bidirectional serialization: FilterState + pagination + enriched toggle <-> URLSearchParams
 *
 * URL format example:
 *   ?kw=python&titles=Engineer&locs=India&sen=senior
 *   &co=Google&avail=open_to_work&pg=3&enriched=1
 *
 * New in v2:
 *   pg       — current page number (1-based), omitted when page=1
 *   enriched — "1" when enriched-only filter is active
 */

import type { FilterState } from "../types";

const SEP    = ",";
const ESCAPE = "__COMMA__";

function encodeValue(v: string): string  { return v.replace(/,/g, ESCAPE).trim(); }
function decodeValue(v: string): string  { return v.replace(/__COMMA__/g, ",").trim(); }
function encodeArray(arr: string[]): string {
  return arr.filter(Boolean).map(encodeValue).join(SEP);
}
function decodeArray(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(SEP).map(decodeValue).filter(Boolean);
}

export interface SerializeOptions {
  page?:     number;   // current page  ->  ?pg=N  (omitted if 1)
  enriched?: boolean;  // enriched view ->  ?enriched=1
}

// Serialize FilterState + page/enriched -> URLSearchParams
export function serializeFilters(
  filters: FilterState,
  opts:    SerializeOptions = {}
): URLSearchParams {
  const p = new URLSearchParams();
  const set = (key: string, arr: string[]) => {
    const v = encodeArray(arr);
    if (v) p.set(key, v);
  };
  if (filters.keywords?.trim()) p.set("kw", encodeValue(filters.keywords.trim()));
  set("titles", filters.titles        || []);
  set("locs",   filters.locations     || []);
  set("sen",    filters.seniorities   || []);
  set("co",     filters.companyNames  || []);
  set("avail",  filters.availabilityIntent || []);
  if (filters.skills?.length) set("skills", filters.skills);
  // page — only write if > 1
  if (opts.page && opts.page > 1) p.set("pg", String(opts.page));
  if (opts.enriched) p.set("enriched", "1");
  return p;
}

// Deserialize URLSearchParams -> FilterState
export function deserializeFiltersFromParams(params: URLSearchParams): Partial<FilterState> {
  return {
    keywords:           decodeValue(params.get("kw") || ""),
    titles:             decodeArray(params.get("titles")),
    locations:          decodeArray(params.get("locs")),
    seniorities:        decodeArray(params.get("sen")),
    companyNames:       decodeArray(params.get("co")),
    availabilityIntent: decodeArray(params.get("avail")),
    skills:             decodeArray(params.get("skills")),
    emailStatuses:      [],
  };
}

// Read page from params (default 1)
export function pageFromParams(params: URLSearchParams): number {
  const raw = params.get("pg");
  if (!raw) return 1;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

// Read enriched toggle
export function enrichedFromParams(params: URLSearchParams): boolean {
  return params.get("enriched") === "1";
}

// Quick check — does URL have any filter (ignores pg / enriched)
export function hasFiltersInParams(params: URLSearchParams): boolean {
  return ["kw","titles","locs","sen","co","avail"].some(k => !!params.get(k));
}

// Count active filter sections (for badge)
export function filterCountFromParams(params: URLSearchParams): number {
  return ["kw","titles","locs","sen","co","avail"].filter(k => !!params.get(k)).length;
}