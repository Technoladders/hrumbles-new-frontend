// src/hooks/sales/useContactWorkspaceFiles.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from 'react-redux';
import { useToast } from '@/hooks/use-toast';

export interface ContactWorkspaceFile {
  id: string;
  contact_id: string;
  file_id: string;
  added_at: string;
  added_by: string | null;
}

// Hook to get all files a contact belongs to
export const useContactFiles = (contactId: string | undefined) => {
  return useQuery<ContactWorkspaceFile[], Error>({
    queryKey: ['contact-files', contactId],
    queryFn: async () => {
      if (!contactId) return [];
      
      const { data, error } = await supabase
        .from('contact_workspace_files')
        .select('*')
        .eq('contact_id', contactId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!contactId
  });
};

// Hook to get all contacts in a specific file/list
export const useFileContacts = (fileId: string | undefined) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  
  return useQuery({
    queryKey: ['file-contacts', fileId, organization_id],
    queryFn: async () => {
      if (!fileId || !organization_id) return [];
      
      const { data, error } = await supabase
        .from('contact_workspace_files')
        .select(`
          id,
          contact_id,
          file_id,
          added_at,
          added_by,
          contacts (
            *,
            companies(name, logo_url, industry),
            created_by_employee:hr_employees!created_by(first_name, last_name, profile_picture_url),
            updated_by_employee:hr_employees!updated_by(first_name, last_name, profile_picture_url),
            intel_person:enrichment_people!contact_id(
              apollo_person_id,
              enrichment_person_metadata(seniority, departments, functions),
              enrichment_organizations(industry, estimated_num_employees, annual_revenue_printed)
            ),
            enrichment_contact_emails(email, email_status, is_primary, source),
            enrichment_contact_phones(phone_number, type, status, source_name)
          )
        `)
        .eq('file_id', fileId);
      
      if (error) throw error;
      
      // Flatten the response to return contacts with their junction data
      return (data || []).map(item => {
        const contact = item.contacts;
        const intel = contact?.intel_person?.[0];
        
        return {
          ...contact,
          junction_id: item.id,
          added_at: item.added_at,
          added_by: item.added_by,
          company_name: contact?.companies?.name,
          is_discovery: false,
          seniority: intel?.enrichment_person_metadata?.seniority,
          departments: intel?.enrichment_person_metadata?.departments,
          functions: intel?.enrichment_person_metadata?.functions,
          industry: intel?.enrichment_organizations?.industry,
          revenue: intel?.enrichment_organizations?.annual_revenue_printed,
          employee_count: intel?.enrichment_organizations?.estimated_num_employees,
          all_emails: contact?.enrichment_contact_emails || [],
          all_phones: contact?.enrichment_contact_phones || []
        };
      });
    },
    enabled: !!fileId && !!organization_id
  });
};

// Hook for managing contact-file associations
export const useManageContactFiles = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const user = useSelector((state: any) => state.auth.user);

  // Add contact to a file/list
  const addContactToFile = useMutation({
    mutationFn: async ({ contactId, fileId }: { contactId: string; fileId: string }) => {
      const { data, error } = await supabase
        .from('contact_workspace_files')
        .upsert({
          contact_id: contactId,
          file_id: fileId,
          added_by: user?.id
        }, {
          onConflict: 'contact_id,file_id'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast({ title: "Added to List", description: "Contact has been added to the list." });
      queryClient.invalidateQueries({ queryKey: ['contact-files', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['file-contacts', variables.fileId] });
      queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
      queryClient.invalidateQueries({ queryKey: ['listRecordCounts'] });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Failed to add", 
        description: error.message 
      });
    }
  });

  // Remove contact from a file/list
  const removeContactFromFile = useMutation({
    mutationFn: async ({ contactId, fileId }: { contactId: string; fileId: string }) => {
      const { error } = await supabase
        .from('contact_workspace_files')
        .delete()
        .eq('contact_id', contactId)
        .eq('file_id', fileId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({ title: "Removed from List", description: "Contact has been removed from the list." });
      queryClient.invalidateQueries({ queryKey: ['contact-files', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['file-contacts', variables.fileId] });
      queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
      queryClient.invalidateQueries({ queryKey: ['listRecordCounts'] });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Failed to remove", 
        description: error.message 
      });
    }
  });

  // Add contact to multiple files at once
  const addContactToMultipleFiles = useMutation({
    mutationFn: async ({ contactId, fileIds }: { contactId: string; fileIds: string[] }) => {
      const inserts = fileIds.map(fileId => ({
        contact_id: contactId,
        file_id: fileId,
        added_by: user?.id
      }));
      
      const { data, error } = await supabase
        .from('contact_workspace_files')
        .upsert(inserts, { onConflict: 'contact_id,file_id' })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast({ 
        title: "Added to Lists", 
        description: `Contact added to ${variables.fileIds.length} list(s).` 
      });
      queryClient.invalidateQueries({ queryKey: ['contact-files', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['file-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
      queryClient.invalidateQueries({ queryKey: ['listRecordCounts'] });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Failed to add", 
        description: error.message 
      });
    }
  });

  return {
    addContactToFile,
    removeContactFromFile,
    addContactToMultipleFiles
  };
};