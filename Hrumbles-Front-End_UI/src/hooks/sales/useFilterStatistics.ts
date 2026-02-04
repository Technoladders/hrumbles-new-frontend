// src/hooks/sales/useFilterStatistics.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from 'react-redux';

interface FilterStatistics {
  total: number;
  hasEmail: number;
  hasPhone: number;
  enriched: number;
  stages: Record<string, number>;
  sources: Record<string, number>;
  seniorities: Record<string, number>;
  industries: Record<string, number>;
  departments: Record<string, number>;
  employeeRanges: Record<string, number>;
  countries: Record<string, number>;
  cities: Record<string, number>;
}

interface UseFilterStatisticsOptions {
  fileId?: string | null;
}

export const useFilterStatistics = (options: UseFilterStatisticsOptions = {}) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const { fileId } = options;

  return useQuery({
    queryKey: ['filter-statistics', organization_id, fileId],
    queryFn: async (): Promise<FilterStatistics> => {
      // Initialize counts
      const stats: FilterStatistics = {
        total: 0,
        hasEmail: 0,
        hasPhone: 0,
        enriched: 0,
        stages: {},
        sources: {},
        seniorities: {},
        industries: {},
        departments: {},
        employeeRanges: {},
        countries: {},
        cities: {},
      };

      // Build base query depending on whether we're filtering by file
      let query;
      
      if (fileId) {
        // For file-specific view, join through junction table
        query = supabase
          .from('contact_workspace_files')
          .select(`
            contacts!inner (
              id,
              email,
              mobile,
              contact_stage,
              medium,
              country,
              city,
              apollo_person_id,
              intel_person:enrichment_people!contact_id (
                apollo_person_id,
                enrichment_person_metadata (
                  seniority,
                  departments
                ),
                enrichment_organizations (
                  industry,
                  estimated_num_employees
                )
              ),
              enrichment_contact_emails (id),
              enrichment_contact_phones (id)
            )
          `)
          .eq('file_id', fileId);
      } else {
        // For all contacts view
        query = supabase
          .from('contacts')
          .select(`
            id,
            email,
            mobile,
            contact_stage,
            medium,
            country,
            city,
            apollo_person_id,
            intel_person:enrichment_people!contact_id (
              apollo_person_id,
              enrichment_person_metadata (
                seniority,
                departments
              ),
              enrichment_organizations (
                industry,
                estimated_num_employees
              )
            ),
            enrichment_contact_emails (id),
            enrichment_contact_phones (id)
          `)
          .eq('organization_id', organization_id);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Process data - handle both file and non-file query structures
      const contacts = fileId 
        ? (data || []).map((item: any) => item.contacts).filter(Boolean)
        : (data || []);

      stats.total = contacts.length;

      contacts.forEach((contact: any) => {
        // Has Email
        if (contact.email || (contact.enrichment_contact_emails && contact.enrichment_contact_emails.length > 0)) {
          stats.hasEmail++;
        }

        // Has Phone
        if (contact.mobile || (contact.enrichment_contact_phones && contact.enrichment_contact_phones.length > 0)) {
          stats.hasPhone++;
        }

        // Enriched
        if (contact.apollo_person_id || (contact.intel_person && contact.intel_person.length > 0)) {
          stats.enriched++;
        }

        // Contact Stage
        if (contact.contact_stage) {
          stats.stages[contact.contact_stage] = (stats.stages[contact.contact_stage] || 0) + 1;
        }

        // Source/Medium
        if (contact.medium) {
          stats.sources[contact.medium] = (stats.sources[contact.medium] || 0) + 1;
        }

        // Country
        if (contact.country) {
          stats.countries[contact.country] = (stats.countries[contact.country] || 0) + 1;
        }

        // City
        if (contact.city) {
          stats.cities[contact.city] = (stats.cities[contact.city] || 0) + 1;
        }

        // Process enrichment data
        const intel = contact.intel_person?.[0];
        if (intel) {
          // Seniority
          const seniority = intel.enrichment_person_metadata?.seniority;
          if (seniority) {
            const seniorityKey = seniority.toLowerCase();
            stats.seniorities[seniorityKey] = (stats.seniorities[seniorityKey] || 0) + 1;
          }

          // Departments
          const departments = intel.enrichment_person_metadata?.departments;
          if (departments && Array.isArray(departments)) {
            departments.forEach((dept: string) => {
              stats.departments[dept] = (stats.departments[dept] || 0) + 1;
            });
          }

          // Industry
          const industry = intel.enrichment_organizations?.industry;
          if (industry) {
            stats.industries[industry] = (stats.industries[industry] || 0) + 1;
          }

          // Employee Count Range
          const empCount = intel.enrichment_organizations?.estimated_num_employees;
          if (empCount) {
            let range = '';
            if (empCount <= 10) range = '1-10';
            else if (empCount <= 50) range = '11-50';
            else if (empCount <= 200) range = '51-200';
            else if (empCount <= 500) range = '201-500';
            else if (empCount <= 1000) range = '501-1000';
            else if (empCount <= 5000) range = '1001-5000';
            else if (empCount <= 10000) range = '5001-10000';
            else range = '10001+';
            
            stats.employeeRanges[range] = (stats.employeeRanges[range] || 0) + 1;
          }
        }
      });

      return stats;
    },
    enabled: !!organization_id,
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  });
};