// src/hooks/sales/useEnrichedFilterOptions.ts
// Enterprise-grade hook for fetching filter options from enrichment tables

import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from 'react-redux';

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

/**
 * Hook to fetch unique seniority levels from enrichment_person_metadata
 */
export const useSeniorityOptions = () => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  return useQuery<FilterOption[]>({
    queryKey: ['filterOptions', 'seniority', organization_id],
    queryFn: async () => {
      if (!organization_id) return [];

      // Get unique seniority values from enrichment_person_metadata
      const { data, error } = await supabase
        .from('enrichment_person_metadata')
        .select('seniority')
        .not('seniority', 'is', null);

      if (error) throw error;

      // Count occurrences and create options
      const counts = data.reduce((acc: Record<string, number>, row) => {
        const seniority = row.seniority;
        acc[seniority] = (acc[seniority] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(counts)
        .map(([value, count]) => ({
          label: value,
          value: value,
          count: count as number,
        }))
        .sort((a, b) => b.count - a.count); // Sort by most common
    },
    enabled: !!organization_id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

/**
 * Hook to fetch unique departments from enrichment_person_metadata
 */
export const useDepartmentOptions = () => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  return useQuery<FilterOption[]>({
    queryKey: ['filterOptions', 'departments', organization_id],
    queryFn: async () => {
      if (!organization_id) return [];

      const { data, error } = await supabase
        .from('enrichment_person_metadata')
        .select('departments')
        .not('departments', 'is', null);

      if (error) throw error;

      // Flatten arrays and count occurrences
      const allDepts: string[] = [];
      data.forEach(row => {
        if (Array.isArray(row.departments)) {
          allDepts.push(...row.departments);
        }
      });

      const counts = allDepts.reduce((acc: Record<string, number>, dept) => {
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(counts)
        .map(([value, count]) => ({
          label: value,
          value: value,
          count: count as number,
        }))
        .sort((a, b) => b.count - a.count);
    },
    enabled: !!organization_id,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook to fetch unique functions from enrichment_person_metadata
 */
export const useFunctionOptions = () => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  return useQuery<FilterOption[]>({
    queryKey: ['filterOptions', 'functions', organization_id],
    queryFn: async () => {
      if (!organization_id) return [];

      const { data, error } = await supabase
        .from('enrichment_person_metadata')
        .select('functions')
        .not('functions', 'is', null);

      if (error) throw error;

      // Flatten arrays
      const allFunctions: string[] = [];
      data.forEach(row => {
        if (Array.isArray(row.functions)) {
          allFunctions.push(...row.functions);
        }
      });

      const counts = allFunctions.reduce((acc: Record<string, number>, func) => {
        acc[func] = (acc[func] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(counts)
        .map(([value, count]) => ({
          label: value,
          value: value,
          count: count as number,
        }))
        .sort((a, b) => b.count - a.count);
    },
    enabled: !!organization_id,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook to fetch employee count ranges from enrichment_organizations
 */
export const useEmployeeCountRanges = () => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  return useQuery<FilterOption[]>({
    queryKey: ['filterOptions', 'employeeCount', organization_id],
    queryFn: async () => {
      // Pre-defined ranges
      const ranges: FilterOption[] = [
        { label: '1-10 employees', value: '1-10' },
        { label: '11-50 employees', value: '11-50' },
        { label: '51-200 employees', value: '51-200' },
        { label: '201-500 employees', value: '201-500' },
        { label: '501-1000 employees', value: '501-1000' },
        { label: '1001-5000 employees', value: '1001-5000' },
        { label: '5000+ employees', value: '5000+' },
      ];

      // Get counts for each range
      if (!organization_id) return ranges;

      const { data, error } = await supabase
        .from('enrichment_organizations')
        .select('estimated_num_employees');

      if (error) return ranges;

      // Count how many companies fall into each range
      const counts: Record<string, number> = {};
      data.forEach(row => {
        const count = row.estimated_num_employees;
        if (!count) return;

        if (count <= 10) counts['1-10'] = (counts['1-10'] || 0) + 1;
        else if (count <= 50) counts['11-50'] = (counts['11-50'] || 0) + 1;
        else if (count <= 200) counts['51-200'] = (counts['51-200'] || 0) + 1;
        else if (count <= 500) counts['201-500'] = (counts['201-500'] || 0) + 1;
        else if (count <= 1000) counts['501-1000'] = (counts['501-1000'] || 0) + 1;
        else if (count <= 5000) counts['1001-5000'] = (counts['1001-5000'] || 0) + 1;
        else counts['5000+'] = (counts['5000+'] || 0) + 1;
      });

      return ranges.map(range => ({
        ...range,
        count: counts[range.value] || 0,
      }));
    },
    enabled: !!organization_id,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook to fetch revenue ranges from enrichment_organizations
 */
export const useRevenueRanges = () => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  return useQuery<FilterOption[]>({
    queryKey: ['filterOptions', 'revenue', organization_id],
    queryFn: async () => {
      const ranges: FilterOption[] = [
        { label: 'Under $1M', value: '0-1000000' },
        { label: '$1M - $10M', value: '1000000-10000000' },
        { label: '$10M - $50M', value: '10000000-50000000' },
        { label: '$50M - $100M', value: '50000000-100000000' },
        { label: '$100M - $500M', value: '100000000-500000000' },
        { label: '$500M - $1B', value: '500000000-1000000000' },
        { label: 'Over $1B', value: '1000000000+' },
      ];

      if (!organization_id) return ranges;

      const { data, error } = await supabase
        .from('enrichment_organizations')
        .select('annual_revenue');

      if (error) return ranges;

      const counts: Record<string, number> = {};
      data.forEach(row => {
        const revenue = row.annual_revenue;
        if (!revenue) return;

        if (revenue < 1000000) counts['0-1000000'] = (counts['0-1000000'] || 0) + 1;
        else if (revenue < 10000000) counts['1000000-10000000'] = (counts['1000000-10000000'] || 0) + 1;
        else if (revenue < 50000000) counts['10000000-50000000'] = (counts['10000000-50000000'] || 0) + 1;
        else if (revenue < 100000000) counts['50000000-100000000'] = (counts['50000000-100000000'] || 0) + 1;
        else if (revenue < 500000000) counts['100000000-500000000'] = (counts['100000000-500000000'] || 0) + 1;
        else if (revenue < 1000000000) counts['500000000-1000000000'] = (counts['500000000-1000000000'] || 0) + 1;
        else counts['1000000000+'] = (counts['1000000000+'] || 0) + 1;
      });

      return ranges.map(range => ({
        ...range,
        count: counts[range.value] || 0,
      }));
    },
    enabled: !!organization_id,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook to fetch unique industries from enrichment_organizations
 */
export const useIndustryOptions = () => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  return useQuery<FilterOption[]>({
    queryKey: ['filterOptions', 'industry', organization_id],
    queryFn: async () => {
      if (!organization_id) return [];

      const { data, error } = await supabase
        .from('enrichment_organizations')
        .select('industry, secondary_industries')
        .not('industry', 'is', null);

      if (error) throw error;

      // Combine primary and secondary industries
      const allIndustries: string[] = [];
      data.forEach(row => {
        if (row.industry) allIndustries.push(row.industry);
        if (Array.isArray(row.secondary_industries)) {
          allIndustries.push(...row.secondary_industries);
        }
      });

      const counts = allIndustries.reduce((acc: Record<string, number>, industry) => {
        acc[industry] = (acc[industry] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(counts)
        .map(([value, count]) => ({
          label: value,
          value: value,
          count: count as number,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50); // Top 50 industries
    },
    enabled: !!organization_id,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook to fetch medium options (source of contact)
 */
export const useMediumOptions = () => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  return useQuery<FilterOption[]>({
    queryKey: ['filterOptions', 'medium', organization_id],
    queryFn: async () => {
      if (!organization_id) return [];

      const { data, error } = await supabase
        .from('contacts')
        .select('medium')
        .eq('organization_id', organization_id)
        .not('medium', 'is', null);

      if (error) throw error;

      const counts = data.reduce((acc: Record<string, number>, row) => {
        const medium = row.medium;
        acc[medium] = (acc[medium] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(counts)
        .map(([value, count]) => ({
          label: value,
          value: value,
          count: count as number,
        }))
        .sort((a, b) => b.count - a.count);
    },
    enabled: !!organization_id,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook to get aggregated filter statistics
 */
export const useFilterStatistics = () => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  return useQuery({
    queryKey: ['filterStatistics', organization_id],
    queryFn: async () => {
      if (!organization_id) return null;

      // Get total contacts
      const { count: totalContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization_id);

      // Get enriched contacts
      const { count: enrichedContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization_id)
        .not('apollo_person_id', 'is', null);

      // Get contacts with email
      const { count: withEmail } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization_id)
        .not('email', 'is', null);

      // Get contacts with phone
      const { count: withPhone } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization_id)
        .not('mobile', 'is', null);

      return {
        totalContacts: totalContacts || 0,
        enrichedContacts: enrichedContacts || 0,
        withEmail: withEmail || 0,
        withPhone: withPhone || 0,
        enrichmentRate: totalContacts ? Math.round((enrichedContacts! / totalContacts) * 100) : 0,
      };
    },
    enabled: !!organization_id,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });
};