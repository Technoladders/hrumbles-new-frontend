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
      // Initialize counts
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

      // Build query
      let query = supabase
        .from('companies')
        .select(`
          id,
          industry,
          location,
          city,
          state,
          country,
          stage,
          status,
          employee_count,
          revenue,
          founded_year,
          apollo_org_id
        `)
        .eq('organization_id', organization_id);

      if (fileId) {
        query = query.eq('file_id', fileId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      const companies = data || [];
      stats.total = companies.length;

      companies.forEach((company: any) => {
        // Has Apollo Data
        if (company.apollo_org_id) {
          stats.hasApolloData++;
        }

        // Active/Promoted
        if (company.status === 'Active') {
          stats.activeCount++;
        }

        // Industry
        if (company.industry) {
          const industry = company.industry.toLowerCase().trim();
          stats.industries[industry] = (stats.industries[industry] || 0) + 1;
        }

        // Location (full)
        if (company.location) {
          stats.locations[company.location] = (stats.locations[company.location] || 0) + 1;
        }

        // Country
        if (company.country) {
          stats.countries[company.country] = (stats.countries[company.country] || 0) + 1;
        }

        // City
        if (company.city) {
          const cityKey = company.state 
            ? `${company.city}, ${company.state}`
            : company.city;
          stats.cities[cityKey] = (stats.cities[cityKey] || 0) + 1;
        }

        // Stage
        if (company.stage) {
          stats.stages[company.stage] = (stats.stages[company.stage] || 0) + 1;
        }

        // Employee Count Range
        const empCount = company.employee_count;
        if (empCount) {
          let range = '';
          if (empCount <= 10) range = '1,10';
          else if (empCount <= 50) range = '11,50';
          else if (empCount <= 200) range = '51,200';
          else if (empCount <= 500) range = '201,500';
          else if (empCount <= 1000) range = '501,1000';
          else if (empCount <= 5000) range = '1001,5000';
          else if (empCount <= 10000) range = '5001,10000';
          else range = '10000,';
          
          stats.employeeRanges[range] = (stats.employeeRanges[range] || 0) + 1;
        }

        // Revenue Range
        const revenue = company.revenue;
        if (revenue) {
          let range = '';
          if (revenue < 1000000) range = '0,1000000';
          else if (revenue < 10000000) range = '1000000,10000000';
          else if (revenue < 50000000) range = '10000000,50000000';
          else if (revenue < 100000000) range = '50000000,100000000';
          else if (revenue < 500000000) range = '100000000,500000000';
          else if (revenue < 1000000000) range = '500000000,1000000000';
          else range = '1000000000,';
          
          stats.revenueRanges[range] = (stats.revenueRanges[range] || 0) + 1;
        }

        // Founded Year
        if (company.founded_year) {
          const decade = Math.floor(company.founded_year / 10) * 10;
          const decadeKey = `${decade}s`;
          stats.foundedYears[decadeKey] = (stats.foundedYears[decadeKey] || 0) + 1;
        }
      });

      return stats;
    },
    enabled: !!organization_id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

export default useCompanyFilterStatistics;