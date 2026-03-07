// src/hooks/sales/useContactFilterParams.ts
// Serialises ALL contact filters + pagination to URL search params.
// Arrays → comma-separated  |  booleans → "1"  |  page/perPage as numbers
// This means browser back/forward, refresh, and page-to-page navigation
// all restore the exact filter state AND the current page.

import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

export interface ContactFilters {
  search:            string;
  jobTitles:         string[];
  managementLevels:  string[];
  departments:       string[];
  functions:         string[];
  seniorities:       string[];
  employeeCounts:    string[];
  stages:            string[];
  sources:           string[];
  industries:        string[];
  companyIds:        number[];
  excludeCompanyIds: number[];    // exclude companies
  excludeJobTitles:  string[];    // exclude job titles
  countries:         string[];
  states:            string[];    // state/region
  cities:            string[];
  hasEmail:          boolean;
  hasPhone:          boolean;
  isEnriched:        boolean;
}

export const EMPTY_FILTERS: ContactFilters = {
  search:            '',
  jobTitles:         [],
  managementLevels:  [],
  departments:       [],
  functions:         [],
  seniorities:       [],
  employeeCounts:    [],
  stages:            [],
  sources:           [],
  industries:        [],
  companyIds:        [],
  excludeCompanyIds: [],
  excludeJobTitles:  [],
  countries:         [],
  states:            [],
  cities:            [],
  hasEmail:          false,
  hasPhone:          false,
  isEnriched:        false,
};

const ARRAY_STRING_KEYS: (keyof ContactFilters)[] = [
  'jobTitles','excludeJobTitles','managementLevels','departments','functions',
  'seniorities','employeeCounts','stages','sources',
  'industries','countries','states','cities',
];
const ARRAY_NUM_KEYS: (keyof ContactFilters)[] = ['companyIds','excludeCompanyIds'];
const BOOL_KEYS:      (keyof ContactFilters)[] = ['hasEmail','hasPhone','isEnriched'];

export function parseFiltersFromParams(params: URLSearchParams): ContactFilters {
  const f = { ...EMPTY_FILTERS };
  f.search = params.get('search') || '';
  ARRAY_STRING_KEYS.forEach(k => {
    const raw = params.get(k as string);
    (f as any)[k] = raw ? raw.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  });
  ARRAY_NUM_KEYS.forEach(k => {
    const raw = params.get(k as string);
    (f as any)[k] = raw
      ? raw.split(',').map((s: string) => parseInt(s.trim(), 10)).filter((n: number) => !isNaN(n))
      : [];
  });
  BOOL_KEYS.forEach(k => { (f as any)[k] = params.get(k as string) === '1'; });
  return f;
}

export function filtersToParams(f: ContactFilters): Record<string, string> {
  const out: Record<string, string> = {};
  if (f.search) out['search'] = f.search;
  ARRAY_STRING_KEYS.forEach(k => {
    const arr = (f as any)[k] as string[];
    if (arr.length) out[k as string] = arr.join(',');
  });
  ARRAY_NUM_KEYS.forEach(k => {
    const arr = (f as any)[k] as number[];
    if (arr.length) out[k as string] = arr.join(',');
  });
  BOOL_KEYS.forEach(k => { if ((f as any)[k]) out[k as string] = '1'; });
  return out;
}

export function hasActiveFilters(f: ContactFilters): boolean {
  if (f.search || f.hasEmail || f.hasPhone || f.isEnriched) return true;
  return [...ARRAY_STRING_KEYS, ...ARRAY_NUM_KEYS].some(
    k => ((f as any)[k] as any[]).length > 0
  );
}

export function buildFilterSummary(f: ContactFilters): string {
  const parts: string[] = [];
  if (f.search)             parts.push(`"${f.search}"`);
  if (f.jobTitles.length)   parts.push(f.jobTitles.slice(0,2).join(', '));
  if (f.seniorities.length) parts.push(f.seniorities.slice(0,2).join(', '));
  if (f.stages.length)      parts.push(f.stages.slice(0,2).join(', '));
  if (f.countries.length)   parts.push(f.countries.slice(0,2).join(', '));
  if (f.industries.length)  parts.push(f.industries.slice(0,2).join(', '));
  if (f.sources.length)     parts.push(f.sources.slice(0,2).join(', '));
  if (f.hasEmail)           parts.push('Has Email');
  if (f.hasPhone)           parts.push('Has Phone');
  if (f.isEnriched)         parts.push('Enriched');
  return parts.slice(0,5).join(' · ') || 'All Contacts';
}

export function countActiveFilters(f: ContactFilters): number {
  let n = 0;
  if (f.search) n++;
  if (f.hasEmail) n++;
  if (f.hasPhone) n++;
  if (f.isEnriched) n++;
  [...ARRAY_STRING_KEYS, ...ARRAY_NUM_KEYS].forEach(k => {
    n += ((f as any)[k] as any[]).length;
  });
  return n;
}

/** Hook: read/write filters + pagination in URL */
export function useFilterParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentFilters = parseFiltersFromParams(searchParams);
  const currentPage    = Math.max(1, parseInt(searchParams.get('page')    || '1',  10));
  const currentPerPage = [10,25,50,100].includes(parseInt(searchParams.get('perPage') || '25', 10))
    ? parseInt(searchParams.get('perPage') || '25', 10)
    : 25;

  const ALL_PARAM_KEYS = [
    'search', 'page', 'perPage',
    ...ARRAY_STRING_KEYS, ...ARRAY_NUM_KEYS, ...BOOL_KEYS,
  ] as string[];

  const writeFilters = useCallback((
    filters: ContactFilters,
    page    = 1,
    perPage?: number,
  ) => {
    setSearchParams(prev => {
      const pp = perPage ?? parseInt(prev.get('perPage') || '25', 10);
      ALL_PARAM_KEYS.forEach(k => prev.delete(k));
      const serialised = filtersToParams(filters);
      Object.entries(serialised).forEach(([k, v]) => prev.set(k, v));
      prev.set('page',    String(page));
      prev.set('perPage', String(pp));
      return prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSearchParams]);

  const writePage = useCallback((page: number) => {
    setSearchParams(prev => { prev.set('page', String(page)); return prev; });
  }, [setSearchParams]);

  const writePerPage = useCallback((perPage: number) => {
    setSearchParams(prev => {
      prev.set('perPage', String(perPage));
      prev.set('page', '1');
      return prev;
    });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams(prev => {
      const pp = prev.get('perPage') || '25';
      ALL_PARAM_KEYS.forEach(k => prev.delete(k));
      prev.set('page', '1');
      prev.set('perPage', pp);
      return prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSearchParams]);

  return {
    currentFilters,
    currentPage,
    currentPerPage,
    writeFilters,
    writePage,
    writePerPage,
    clearFilters,
    searchParams,
  };
}