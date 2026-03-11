// src/hooks/sales/useCompanyFilterStatistics.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from 'react-redux';

export interface CompanyFilterStatistics {
  total:          number;
  enrichedCount:  number; // distinct company_ids in enrichment_org_raw_responses
  hasPhoneCount:  number; // companies with a non-null phone column
  industries:     Record<string, number>;
  locations:      Record<string, number>;
  countries:      Record<string, number>;
  cities:         Record<string, number>;
  stages:         Record<string, number>;
  employeeRanges: Record<string, number>;
  revenueRanges:  Record<string, number>; // bucketed from enrichment_organizations.annual_revenue
  foundedYears:   Record<string, number>;
}

interface UseCompanyFilterStatisticsOptions {
  fileId?: string | null;
}

export const useCompanyFilterStatistics = (options: UseCompanyFilterStatisticsOptions = {}) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const { fileId } = options;

  return useQuery({
    queryKey: ['company-filter-statistics', organization_id, fileId],
    queryFn: async (): Promise<CompanyFilterStatistics> => {
      const stats: CompanyFilterStatistics = {
        total:          0,
        enrichedCount:  0,
        hasPhoneCount:  0,
        industries:     {},
        locations:      {},
        countries:      {},
        cities:         {},
        stages:         {},
        employeeRanges: {},
        revenueRanges:  {},
        foundedYears:   {},
      };

      // ── Step 1: Fetch all company base data for this org in one query ─────
      // Selecting only the columns we need for stats keeps payload small.
      const { data: orgCompanies, error: orgError } = await supabase
        .from('companies')
        .select('id, apollo_org_id, phone, industry, location, country, city, state, stage, employee_count, founded_year')
        .eq('organization_id', organization_id);

      if (orgError) throw orgError;

      const allCompanies = orgCompanies || [];
      stats.total        = allCompanies.length;

      const companyIds   = allCompanies.map(c => c.id);
      const apolloOrgIds = allCompanies
        .filter(c => c.apollo_org_id)
        .map(c => c.apollo_org_id as string);

      // ── Step 2: Has phone count ───────────────────────────────────────────
      stats.hasPhoneCount = allCompanies.filter(c => c.phone).length;

      // ── Step 3: Enriched count from enrichment_org_raw_responses ─────────
      // Count distinct company_ids — a company enriched multiple times counts once.
      if (companyIds.length > 0) {
        const CHUNK      = 500; // keep well within URL length limits
        const enrichedSet = new Set<number>();

        for (let i = 0; i < companyIds.length; i += CHUNK) {
          const chunk = companyIds.slice(i, i + CHUNK);
          const { data: rawRows } = await supabase
            .from('enrichment_org_raw_responses')
            .select('company_id')
            .in('company_id', chunk)
            .not('company_id', 'is', null);
          (rawRows || []).forEach(r => r.company_id && enrichedSet.add(r.company_id));
        }

        stats.enrichedCount = enrichedSet.size;
      }

      // ── Step 4: Revenue ranges from enrichment_organizations ─────────────
      // Only companies in this org (joined via apollo_org_id) so counts are org-scoped.
      if (apolloOrgIds.length > 0) {
        const CHUNK = 500;

        for (let i = 0; i < apolloOrgIds.length; i += CHUNK) {
          const chunk = apolloOrgIds.slice(i, i + CHUNK);
          const { data: revRows } = await supabase
            .from('enrichment_organizations')
            .select('annual_revenue')
            .in('apollo_org_id', chunk)
            .not('annual_revenue', 'is', null)
            .gt('annual_revenue', 0);

          (revRows || []).forEach(r => {
            const rev = Number(r.annual_revenue);
            if (isNaN(rev) || rev <= 0) return;
            let range = '';
            if (rev < 1_000_000)          range = '0,1000000';
            else if (rev < 10_000_000)    range = '1000000,10000000';
            else if (rev < 50_000_000)    range = '10000000,50000000';
            else if (rev < 100_000_000)   range = '50000000,100000000';
            else if (rev < 500_000_000)   range = '100000000,500000000';
            else if (rev < 1_000_000_000) range = '500000000,1000000000';
            else                          range = '1000000000,';
            stats.revenueRanges[range] = (stats.revenueRanges[range] || 0) + 1;
          });
        }
      }

      // ── Step 5: All other aggregates computed in-memory from companies ────
      allCompanies.forEach(c => {
        // Industry
        if (c.industry) {
          const key = c.industry.toLowerCase().trim();
          stats.industries[key] = (stats.industries[key] || 0) + 1;
        }
        // Location (full string)
        if (c.location) stats.locations[c.location] = (stats.locations[c.location] || 0) + 1;
        // Country
        if (c.country)  stats.countries[c.country]  = (stats.countries[c.country]  || 0) + 1;
        // City (city + state composite key)
        if (c.city) {
          const key = c.state ? `${c.city}, ${c.state}` : c.city;
          stats.cities[key] = (stats.cities[key] || 0) + 1;
        }
        // Stage
        if (c.stage) stats.stages[c.stage] = (stats.stages[c.stage] || 0) + 1;
        // Employee range bucket
        if (c.employee_count != null) {
          const n = Number(c.employee_count);
          if (!isNaN(n)) {
            let range = '';
            if (n <= 10)        range = '1,10';
            else if (n <= 50)   range = '11,50';
            else if (n <= 200)  range = '51,200';
            else if (n <= 500)  range = '201,500';
            else if (n <= 1000) range = '501,1000';
            else if (n <= 5000) range = '1001,5000';
            else if (n <= 10000) range = '5001,10000';
            else                 range = '10000,';
            stats.employeeRanges[range] = (stats.employeeRanges[range] || 0) + 1;
          }
        }
        // Founded year → decade bucket
        if (c.founded_year != null) {
          const year = Number(c.founded_year);
          if (!isNaN(year)) {
            const decade = `${Math.floor(year / 10) * 10}s`;
            stats.foundedYears[decade] = (stats.foundedYears[decade] || 0) + 1;
          }
        }
      });

      return stats;
    },
    enabled:              !!organization_id,
    staleTime:            30_000,
    refetchOnWindowFocus: false,
  });
};

export default useCompanyFilterStatistics;