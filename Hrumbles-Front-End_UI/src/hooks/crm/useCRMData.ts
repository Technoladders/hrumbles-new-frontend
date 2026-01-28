import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useCRMStore } from '@/stores/crmStore';
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

export const useCRMData = () => {
  const store = useCRMStore();
  const authData = getAuthDataFromLocalStorage();
  
  if (!authData) {
    throw new Error('Failed to retrieve authentication data');
  }
  const { organization_id } = authData;

  return useQuery({
    queryKey: ['crm-data', store.viewMode, store.filters, store.tableSearch],
    queryFn: async () => {
      // 1. Determine base table and selection
      // People mode: Join companies to allow filtering by Industry/Employee Count
      // Company mode: Direct query on companies
      const isPeople = store.viewMode === 'people';
      let query = supabase
        .from(isPeople ? 'contacts' : 'companies')
        .select(isPeople ? '*, companies(*)' : '*', { count: 'exact' });

      // 2. Global/Table Search (Name)
      if (store.tableSearch) {
        query = query.ilike('name', `%${store.tableSearch}%`);
      }

      // 3. Workspace / List Filtering
      if (store.filters.workspace_id.length > 0) {
        const { data: fileIds } = await supabase
            .from('workspace_files')
            .select('id')
            .in('workspace_id', store.filters.workspace_id);
        
        const ids = fileIds?.map(f => f.id) || [];
        query = query.in('file_id', ids);
      }

      if (store.filters.file_id.length > 0) {
        query = query.in('file_id', store.filters.file_id);
      }

      // 4. Contact Attribute Filters (People Mode)
      if (isPeople) {
        if (store.filters.contact_stage.length > 0) {
          query = query.in('contact_stage', store.filters.contact_stage);
        }
        if (store.filters.seniorities.length > 0) {
          // Job Title contains any of the selected seniorities
          const orFilter = store.filters.seniorities.map(s => `job_title.ilike.%${s}%`).join(',');
          query = query.or(orFilter);
        }
        if (store.filters.locations.length > 0) {
            query = query.in('country', store.filters.locations);
        }
      }

      // 5. Company Attribute Filters
      // If in People mode, we use PostgREST filtered joins (companies.industry)
      if (store.filters.industries.length > 0) {
        if (isPeople) {
          query = query.filter('companies.industry', 'in', `(${store.filters.industries.join(',')})`);
        } else {
          query = query.in('industry', store.filters.industries);
        }
      }

      // 6. Employee Count (Range Logic)
      if (store.filters.employeeRanges.length > 0) {
        const ranges = store.filters.employeeRanges; // e.g., ["1-10", "11-50"]
        let rangeParts: string[] = [];
        
        ranges.forEach(range => {
            if (range === '1-10') rangeParts.push('and(employee_count.gte.1,employee_count.lte.10)');
            if (range === '11-50') rangeParts.push('and(employee_count.gte.11,employee_count.lte.50)');
            if (range === '51-200') rangeParts.push('and(employee_count.gte.51,employee_count.lte.200)');
            if (range === '201-500') rangeParts.push('and(employee_count.gte.201,employee_count.lte.500)');
            if (range === '500+') rangeParts.push('employee_count.gte.501');
        });

        const filterKey = isPeople ? 'companies.employee_count' : 'employee_count';
        // PostgREST complex OR for numeric ranges
        if (rangeParts.length > 0) {
             query = query.or(rangeParts.join(','), { foreignTable: isPeople ? 'companies' : undefined });
        }
      }

      // 7. Security and Execution
      const { data, count, error } = await query
        .eq('organization_id', organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filter out records where the joined company didn't match the industry/range filters 
      // (Supabase returns the contact with companies: null if inner filter fails)
      const finalData = isPeople 
        ? data.filter(item => item.companies !== null || Object.keys(store.filters).every(k => store.filters[k as keyof typeof store.filters].length === 0))
        : data;

      return { data: finalData, total: count };
    }
  });
};

export const useUpdateCell = () => {
  const queryClient = useQueryClient();
  const store = useCRMStore();

  return useMutation({
    mutationFn: async ({ id, column, value }: { id: string, column: string, value: any }) => {
      const table = store.viewMode === 'people' ? 'contacts' : 'companies';
      const { error } = await supabase.from(table).update({ [column]: value }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-data'] }),
  });
};