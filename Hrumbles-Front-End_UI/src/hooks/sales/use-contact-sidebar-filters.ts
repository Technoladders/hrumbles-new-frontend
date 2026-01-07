// src/hooks/sales/use-contact-sidebar-filters.ts

export const useContactSidebarFilters = (organizationId: string) => {
  return useQuery({
    queryKey: ['contactSidebarFilters', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      // 1. ADD 'name' and 'email' to the select string
      const { data, error } = await supabase
        .from('contacts')
        .select('name, email, contact_stage, country, city, medium, contact_owner, job_title')
        .eq('organization_id', organizationId);

      if (error) throw error;

      const getUnique = (key: string) => 
        Array.from(new Set(data.map(item => item[key]).filter(Boolean)))
          .sort()
          .map(val => ({ label: String(val), value: String(val) }));

      // 2. ADD them to the top of the returned array
      return [
        { id: 'name', label: 'Name', type: 'select', options: getUnique('name') },
        { id: 'email', label: 'Email', type: 'select', options: getUnique('email') },
        { id: 'job_title', label: 'Job Title', type: 'select', options: getUnique('job_title') },
        { id: 'contact_stage', label: 'Stage', type: 'select', options: getUnique('contact_stage') },
        { id: 'country', label: 'Country', type: 'select', options: getUnique('country') },
        { id: 'contact_owner', label: 'Owner', type: 'select', options: getUnique('contact_owner') },
      ];
    },
    enabled: !!organizationId,
  });
};