import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FilterConfig, FilterOption } from "@/components/sales/AdvancedFilterPanel";

interface UseCompanyFiltersOptions {
  organizationId?: string;
  fileId?: string;
}

export const useCompanyFilters = (options: UseCompanyFiltersOptions = {}) => {
  const { organizationId, fileId } = options;

  // Fetch unique values for each filter field
  const { data: filterData, isLoading } = useQuery({
    queryKey: ['company-filters', organizationId, fileId],
    queryFn: async () => {
      let query = supabase
        .from('companies')
        .select(`
          industry,
          stage,
          location,
          status,
          account_owner,
          created_by,
          hr_employees!companies_created_by_fkey(id, first_name, last_name)
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
      id: 'industry',
      label: 'Industry',
      type: 'select',
      options: processFilterOptions(filterData, 'industry'),
    },
    {
      id: 'stage',
      label: 'Stage',
      type: 'select',
      options: processFilterOptions(filterData, 'stage'),
    },
    {
      id: 'location',
      label: 'Location',
      type: 'select',
      options: processFilterOptions(filterData, 'location'),
    },
    {
      id: 'status',
      label: 'Status',
      type: 'select',
      options: processFilterOptions(filterData, 'status'),
    },
    {
      id: 'account_owner',
      label: 'Account Owner',
      type: 'select',
      options: processFilterOptions(filterData, 'account_owner'),
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