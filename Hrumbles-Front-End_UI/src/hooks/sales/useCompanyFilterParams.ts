// src/hooks/sales/useCompanyFilterParams.ts
// Serialises ALL company CRM filters + pagination to URL search params.
// Arrays → comma-separated  |  booleans → "1"  |  page as numbers
// Mirrors the exact same pattern as useContactFilterParams.ts

import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

// ── Filter shape ─────────────────────────────────────────────────────────────

export interface CompanyFilters {
  search:         string;
  industries:     string[];
  stages:         string[];
  countries:      string[];
  states:         string[];
  cities:         string[];
  employeeRanges: string[];    // "min,max" e.g. "51,200" or "10000,"
  hasApollo:      boolean;     // has enrichment / cloud data
  isActive:       boolean;     // status = 'Active'
  foundedMin:     string;
  foundedMax:     string;
}

export const EMPTY_COMPANY_FILTERS: CompanyFilters = {
  search:         '',
  industries:     [],
  stages:         [],
  countries:      [],
  states:         [],
  cities:         [],
  employeeRanges: [],
  hasApollo:      false,
  isActive:       false,
  foundedMin:     '',
  foundedMax:     '',
};

// ── Serialisation helpers ─────────────────────────────────────────────────────

const ARRAY_KEYS:  (keyof CompanyFilters)[] = [
  'industries','stages','countries','states','cities','employeeRanges',
];
const BOOL_KEYS:   (keyof CompanyFilters)[] = ['hasApollo','isActive'];
const STRING_KEYS: (keyof CompanyFilters)[] = ['search','foundedMin','foundedMax'];

export function parseCompanyFiltersFromParams(params: URLSearchParams): CompanyFilters {
  const f = { ...EMPTY_COMPANY_FILTERS };
  STRING_KEYS.forEach(k => { (f as any)[k] = params.get(k as string) || ''; });
  ARRAY_KEYS.forEach(k => {
    const raw = params.get(k as string);
    (f as any)[k] = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
  });
  BOOL_KEYS.forEach(k => { (f as any)[k] = params.get(k as string) === '1'; });
  return f;
}

export function companyFiltersToParams(f: CompanyFilters): Record<string, string> {
  const out: Record<string, string> = {};
  STRING_KEYS.forEach(k => { if ((f as any)[k]) out[k as string] = (f as any)[k]; });
  ARRAY_KEYS.forEach(k => {
    const arr = (f as any)[k] as string[];
    if (arr.length) out[k as string] = arr.join(',');
  });
  BOOL_KEYS.forEach(k => { if ((f as any)[k]) out[k as string] = '1'; });
  return out;
}

export function hasActiveCompanyFilters(f: CompanyFilters): boolean {
  return !!(
    f.search ||
    f.industries.length || f.stages.length || f.countries.length ||
    f.states.length || f.cities.length || f.employeeRanges.length ||
    f.hasApollo || f.isActive || f.foundedMin || f.foundedMax
  );
}

export function countActiveCompanyFilters(f: CompanyFilters): number {
  let n = 0;
  if (f.search) n++;
  n += f.industries.length + f.stages.length + f.countries.length +
       f.states.length + f.cities.length + f.employeeRanges.length;
  if (f.hasApollo)  n++;
  if (f.isActive)   n++;
  if (f.foundedMin || f.foundedMax) n++;
  return n;
}

export function buildCompanyFilterSummary(f: CompanyFilters): string {
  const parts: string[] = [];
  if (f.search)               parts.push(`"${f.search}"`);
  if (f.industries.length)    parts.push(f.industries.slice(0,2).join(', '));
  if (f.stages.length)        parts.push(`Stage: ${f.stages.slice(0,2).join(', ')}`);
  if (f.countries.length)     parts.push(f.countries.slice(0,2).join(', '));
  if (f.employeeRanges.length) parts.push('Employees filtered');
  if (f.hasApollo)             parts.push('Has cloud data');
  if (f.isActive)              parts.push('Active CRM');
  if (f.foundedMin || f.foundedMax) parts.push(`Founded ${f.foundedMin||''}–${f.foundedMax||''}`);
  return parts.length ? parts.join(' · ') : 'All companies';
}

// ── Hook ─────────────────────────────────────────────────────────────────────
// Exactly mirrors useFilterParams from useContactFilterParams.ts

export function useCompanyFilterParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentFilters = parseCompanyFiltersFromParams(searchParams);
  const currentPage    = parseInt(searchParams.get('page') || '1', 10);

  const writeFilters = useCallback((filters: CompanyFilters, page = 1) => {
    const params = companyFiltersToParams(filters);
    if (page > 1) params['page'] = String(page);
    // preserve mode param
    const mode = searchParams.get('mode');
    if (mode) params['mode'] = mode;
    setSearchParams(params, { replace: true });
  }, [setSearchParams, searchParams]);

  const clearFilters = useCallback(() => {
    const mode = searchParams.get('mode');
    setSearchParams(mode ? { mode } : {}, { replace: true });
  }, [setSearchParams, searchParams]);

  return { currentFilters, currentPage, writeFilters, clearFilters };
}