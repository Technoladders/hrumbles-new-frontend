import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FilterConfig, FilterOption } from "@/components/sales/AdvancedFilterPanel";

interface UseContactFiltersOptions {
  organizationId?: string;
  fileId?: string;
}

export const useContactFilters = (options: UseContactFiltersOptions = {}) => {
  const { organizationId, fileId } = options;

  // Fetch unique values for each filter field
  const { data: filterData, isLoading } = useQuery({
    queryKey: ['contact-filters', organizationId, fileId],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select(`
          job_title,
          company_id,
          companies(id, name),
          medium,
          country,
          state,
          city,
          contact_stage,
          created_by,
          hr_employees!contacts_created_by_fkey(id, first_name, last_name)
        `);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      if (fileId) {
        query = query.eq('file_id', fileId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId || !!fileId,
  });

  // Process the data to create filter options
  const filters: FilterConfig[] = [
    {
      id: 'job_title',
      label: 'Job Title',
      type: 'select',
      options: processFilterOptions(filterData, 'job_title'),
    },
    {
      id: 'company',
      label: 'Company',
      type: 'select',
      options: processCompanyOptions(filterData),
    },
    {
      id: 'medium',
      label: 'Medium',
      type: 'select',
      options: processFilterOptions(filterData, 'medium'),
    },
    {
      id: 'country',
      label: 'Country',
      type: 'select',
      options: processFilterOptions(filterData, 'country'),
    },
    {
      id: 'state',
      label: 'State',
      type: 'select',
      options: processFilterOptions(filterData, 'state'),
    },
    {
      id: 'city',
      label: 'City',
      type: 'select',
      options: processFilterOptions(filterData, 'city'),
    },
    {
      id: 'contact_stage',
      label: 'Contact Stage',
      type: 'select',
      options: processFilterOptions(filterData, 'contact_stage'),
    },
    {
      id: 'created_by',
      label: 'Created By',
      type: 'select',
      options: processCreatedByOptions(filterData),
    },
  ];

  return {
    filters,
    isLoading,
  };
};

// Helper function to process generic filter options
function processFilterOptions(
  data: any[] | undefined,
  field: string
): FilterOption[] {
  if (!data) return [];

  const valueCounts = new Map<string, number>();

  data.forEach((item) => {
    const value = item[field];
    if (value && value.trim() !== '') {
      const trimmedValue = value.trim();
      valueCounts.set(trimmedValue, (valueCounts.get(trimmedValue) || 0) + 1);
    }
  });

  return Array.from(valueCounts.entries())
    .map(([value, count]) => ({
      value,
      label: value,
      count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

// Helper function to process company options
function processCompanyOptions(data: any[] | undefined): FilterOption[] {
  if (!data) return [];

  const companyCounts = new Map<string, { name: string; count: number }>();

  data.forEach((item) => {
    if (item.companies && item.company_id) {
      const companyId = String(item.company_id);
      const companyName = item.companies.name;
      
      if (!companyCounts.has(companyId)) {
        companyCounts.set(companyId, { name: companyName, count: 0 });
      }
      const current = companyCounts.get(companyId)!;
      companyCounts.set(companyId, { ...current, count: current.count + 1 });
    }
  });

  return Array.from(companyCounts.entries())
    .map(([id, { name, count }]) => ({
      value: id,
      label: name,
      count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

// Helper function to process created_by options
function processCreatedByOptions(data: any[] | undefined): FilterOption[] {
  if (!data) return [];

  const creatorCounts = new Map<string, { name: string; count: number }>();

  data.forEach((item) => {
    const creatorId = item.created_by || 'system';
    let creatorName = 'System';

    if (item.hr_employees && item.hr_employees.length > 0) {
      const employee = item.hr_employees[0];
      if (employee.first_name) {
        creatorName = `${employee.first_name} ${employee.last_name || ''}`.trim();
      }
    }

    if (!creatorCounts.has(creatorId)) {
      creatorCounts.set(creatorId, { name: creatorName, count: 0 });
    }
    const current = creatorCounts.get(creatorId)!;
    creatorCounts.set(creatorId, { ...current, count: current.count + 1 });
  });

  return Array.from(creatorCounts.entries())
    .map(([id, { name, count }]) => ({
      value: id,
      label: name,
      count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}