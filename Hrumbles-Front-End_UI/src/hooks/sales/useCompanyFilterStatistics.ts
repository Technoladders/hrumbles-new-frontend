// src/hooks/sales/useCompanyFilterStatistics.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from 'react-redux';

interface CompanyFilterStatistics {
  total: number;
  hasApolloData: number;
  activeCount: number;
  industries: Record<string, number>;
  locations: Record<string, number>;
  countries: Record<string, number>;
  cities: Record<string, number>;
  stages: Record<string, number>;
  employeeRanges: Record<string, number>;
  revenueRanges: Record<string, number>;
  foundedYears: Record<string, number>;
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
        total: 0,
        hasApolloData: 0,
        activeCount: 0,
        industries: {},
        locations: {},
        countries: {},
        cities: {},
        stages: {},
        employeeRanges: {},
        revenueRanges: {},
        foundedYears: {},
      };

      let baseQuery = supabase
        .from('companies')
        .eq('organization_id', organization_id);

      if (fileId) {
        baseQuery = baseQuery.eq('file_id', fileId);
      }

      // 1. Fast total counts (no rows fetched – works for 1 lakh+ instantly)
      const [totalRes, apolloRes, activeRes] = await Promise.all([
        baseQuery.select('*', { count: 'exact', head: true }),
        baseQuery.select('*', { count: 'exact', head: true }).not('apollo_org_id', 'is', null),
        baseQuery.select('*', { count: 'exact', head: true }).eq('status', 'Active')
      ]);

      stats.total = totalRes.count || 0;
      stats.hasApolloData = apolloRes.count || 0;
      stats.activeCount = activeRes.count || 0;

      // 2. Group-by aggregates (only summary data returned – scales perfectly)
      const [
        industriesData,
        locationsData,
        countriesData,
        stagesData,
        citiesData,
        empData,
        revData,
        yearData
      ] = await Promise.all([
        baseQuery.select('industry,count').group('industry'),
        baseQuery.select('location,count').group('location'),
        baseQuery.select('country,count').group('country'),
        baseQuery.select('stage,count').group('stage'),
        baseQuery.select('city,state,count').group('city,state'),
        baseQuery.select('employee_count,count').group('employee_count'),
        baseQuery.select('revenue,count').group('revenue'),
        baseQuery.select('founded_year,count').group('founded_year')
      ]);

      // Industries (lowercase to match your original logic)
      (industriesData.data || []).forEach((item: any) => {
        if (item.industry) {
          const key = item.industry.toLowerCase().trim();
          stats.industries[key] = Number(item.count) || 0;
        }
      });

      // Locations, Countries, Stages
      (locationsData.data || []).forEach((item: any) => {
        if (item.location) stats.locations[item.location] = Number(item.count) || 0;
      });
      (countriesData.data || []).forEach((item: any) => {
        if (item.country) stats.countries[item.country] = Number(item.count) || 0;
      });
      (stagesData.data || []).forEach((item: any) => {
        if (item.stage) stats.stages[item.stage] = Number(item.count) || 0;
      });

      // Cities (city, state)
      (citiesData.data || []).forEach((item: any) => {
        if (item.city) {
          const key = item.state ? `${item.city}, ${item.state}` : item.city;
          stats.cities[key] = Number(item.count) || 0;
        }
      });

      // Employee Ranges (exact same logic as before)
      (empData.data || []).forEach((item: any) => {
        const count = Number(item.employee_count);
        if (isNaN(count)) return;
        let range = '';
        if (count <= 10) range = '1,10';
        else if (count <= 50) range = '11,50';
        else if (count <= 200) range = '51,200';
        else if (count <= 500) range = '201,500';
        else if (count <= 1000) range = '501,1000';
        else if (count <= 5000) range = '1001,5000';
        else if (count <= 10000) range = '5001,10000';
        else range = '10000,';
        stats.employeeRanges[range] = (stats.employeeRanges[range] || 0) + Number(item.count) || 0;
      });

      // Revenue Ranges (exact same logic as before)
      (revData.data || []).forEach((item: any) => {
        const rev = Number(item.revenue);
        if (isNaN(rev)) return;
        let range = '';
        if (rev < 1000000) range = '0,1000000';
        else if (rev < 10000000) range = '1000000,10000000';
        else if (rev < 50000000) range = '10000000,50000000';
        else if (rev < 100000000) range = '50000000,100000000';
        else if (rev < 500000000) range = '100000000,500000000';
        else if (rev < 1000000000) range = '500000000,1000000000';
        else range = '1000000000,';
        stats.revenueRanges[range] = (stats.revenueRanges[range] || 0) + Number(item.count) || 0;
      });

      // Founded Years (decades)
      (yearData.data || []).forEach((item: any) => {
        const year = Number(item.founded_year);
        if (isNaN(year)) return;
        const decade = Math.floor(year / 10) * 10;
        const key = `${decade}s`;
        stats.foundedYears[key] = (stats.foundedYears[key] || 0) + Number(item.count) || 0;
      });

      return stats;
    },
    enabled: !!organization_id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export default useCompanyFilterStatistics;