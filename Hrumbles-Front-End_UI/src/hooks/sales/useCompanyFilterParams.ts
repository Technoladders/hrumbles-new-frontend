// src/hooks/sales/useCompanyFilterParams.ts
import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

// ============================================================================
// Type
// ============================================================================

export interface CompanyDBFilters {
  search:         string;
  companyIds:     number[];       // selected specific companies (include filter)
  industries:     string[];
  locations:      string[];
  stages:         string[];
  employeeRanges: string[];
  revenueRanges:  string[];
  isEnriched:     boolean | null; // true → only companies with enrichment_org_raw_responses records
  hasPhone:       boolean | null; // true → only companies with phone data
  foundedYearMin: number | null;
  foundedYearMax: number | null;
}

export const EMPTY_DB_FILTERS: CompanyDBFilters = {
  search:         '',
  companyIds:     [],
  industries:     [],
  locations:      [],
  stages:         [],
  employeeRanges: [],
  revenueRanges:  [],
  isEnriched:     null,
  hasPhone:       null,
  foundedYearMin: null,
  foundedYearMax: null,
};

// ============================================================================
// Helpers
// ============================================================================

export function countActiveDBFilters(f: CompanyDBFilters): number {
  let n = 0;
  if (f.search)                  n++;
  n += (f.companyIds     || []).length;
  n += (f.industries     || []).length;
  n += (f.locations      || []).length;
  n += (f.stages         || []).length;
  n += (f.employeeRanges || []).length;
  n += (f.revenueRanges  || []).length;
  if (f.isEnriched     !== null) n++;
  if (f.hasPhone       !== null) n++;
  if (f.foundedYearMin !== null) n++;
  if (f.foundedYearMax !== null) n++;
  return n;
}

export function buildDBFilterSummary(f: CompanyDBFilters): string {
  const parts: string[] = [];
  if (f.search)                    parts.push(`"${f.search}"`);
  if ((f.companyIds || []).length)  parts.push(`${f.companyIds.length} compan${f.companyIds.length === 1 ? 'y' : 'ies'}`);
  if ((f.industries || []).length)  parts.push(f.industries.slice(0, 2).join(', ') + (f.industries.length > 2 ? '…' : ''));
  if ((f.locations  || []).length)  parts.push(f.locations.slice(0, 2).join(', ')  + (f.locations.length  > 2 ? '…' : ''));
  if ((f.stages     || []).length)  parts.push(f.stages.slice(0, 2).join(', ')     + (f.stages.length     > 2 ? '…' : ''));
  if (f.isEnriched === true)        parts.push('Enriched');
  if (f.hasPhone   === true)        parts.push('Has Phone');
  if (f.foundedYearMin)             parts.push(`From ${f.foundedYearMin}`);
  if (f.foundedYearMax)             parts.push(`To ${f.foundedYearMax}`);
  return parts.length ? parts.join(' · ') : 'All companies';
}

export function buildDBFilterChips(f: CompanyDBFilters): string[] {
  const chips: string[] = [];
  if (f.search)                       chips.push(`Search: ${f.search}`);
  if ((f.companyIds || []).length)    chips.push(`${f.companyIds.length} compan${f.companyIds.length === 1 ? 'y' : 'ies'} selected`);
  (f.industries     || []).forEach(i  => chips.push(`Industry: ${i}`));
  (f.locations      || []).forEach(l  => chips.push(`Location: ${l}`));
  (f.stages         || []).forEach(s  => chips.push(`Stage: ${s}`));
  (f.employeeRanges || []).forEach(r  => chips.push(`Employees: ${r}`));
  (f.revenueRanges  || []).forEach(r  => chips.push(`Revenue: ${r}`));
  if (f.isEnriched === true)          chips.push('Is Enriched');
  if (f.hasPhone   === true)          chips.push('Has Phone');
  if (f.foundedYearMin)               chips.push(`Founded ≥ ${f.foundedYearMin}`);
  if (f.foundedYearMax)               chips.push(`Founded ≤ ${f.foundedYearMax}`);
  return chips;
}

// ============================================================================
// Hook — syncs CRM filters to URL params for shareability
// ============================================================================

export function useCompanyFilterParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentFilters = useMemo<CompanyDBFilters>(() => {
    try {
      const raw = searchParams.get('crm_filters');
      if (!raw) return EMPTY_DB_FILTERS;
      const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<CompanyDBFilters>;
      return { ...EMPTY_DB_FILTERS, ...parsed };
    } catch {
      return EMPTY_DB_FILTERS;
    }
  }, [searchParams]);

  const currentPage = useMemo(
    () => parseInt(searchParams.get('crm_page') || '1', 10),
    [searchParams],
  );

  const writeFilters = useCallback((filters: CompanyDBFilters, page = 1) => {
    setSearchParams(prev => {
      const n = new URLSearchParams(prev);
      if (countActiveDBFilters(filters) > 0) {
        n.set('crm_filters', encodeURIComponent(JSON.stringify(filters)));
      } else {
        n.delete('crm_filters');
      }
      if (page > 1) n.set('crm_page', page.toString());
      else          n.delete('crm_page');
      return n;
    }, { replace: true });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams(prev => {
      const n = new URLSearchParams(prev);
      n.delete('crm_filters');
      n.delete('crm_page');
      return n;
    }, { replace: true });
  }, [setSearchParams]);

  return { currentFilters, currentPage, writeFilters, clearFilters };
}