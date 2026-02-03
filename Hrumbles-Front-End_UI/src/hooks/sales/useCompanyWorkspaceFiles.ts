// src/hooks/sales/useCompanyWorkspaceFiles.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from 'react-redux';
import { useToast } from '@/hooks/use-toast';

export interface CompanyWorkspaceFile {
  id: string;
  company_id: string;
  file_id: string;
  added_at: string;
  added_by: string | null;
}

// Hook to get all files a company belongs to
export const useCompanyFiles = (companyId: string | undefined) => {
  return useQuery<CompanyWorkspaceFile[], Error>({
    queryKey: ['company-files', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('company_workspace_files')
        .select('*')
        .eq('company_id', companyId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId
  });
};

// Hook to get all companies in a specific file/list
export const useFileCompanies = (fileId: string | undefined) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  
  return useQuery({
    queryKey: ['file-companies', fileId, organization_id],
    queryFn: async () => {
      if (!fileId || !organization_id) return [];
      
      const { data, error } = await supabase
        .from('company_workspace_files')
        .select(`
          id,
          company_id,
          file_id,
          added_at,
          added_by,
          companies (
            id,
            name,
            logo_url,
            industry,
            website,
            linkedin_url,
            employee_count,
            annual_revenue,
            city,
            state,
            country,
            created_at,
            updated_at
          )
        `)
        .eq('file_id', fileId);
      
      if (error) throw error;
      
      // Flatten the response to return companies with their junction data
      return (data || []).map(item => ({
        ...item.companies,
        junction_id: item.id,
        added_at: item.added_at,
        added_by: item.added_by
      }));
    },
    enabled: !!fileId && !!organization_id
  });
};

// Hook for managing company-file associations
export const useManageCompanyFiles = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const user = useSelector((state: any) => state.auth.user);

  // Add company to a file/list
  const addCompanyToFile = useMutation({
    mutationFn: async ({ companyId, fileId }: { companyId: string; fileId: string }) => {
      const { data, error } = await supabase
        .from('company_workspace_files')
        .upsert({
          company_id: companyId,
          file_id: fileId,
          added_by: user?.id
        }, {
          onConflict: 'company_id,file_id'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast({ title: "Added to List", description: "Company has been added to the list." });
      queryClient.invalidateQueries({ queryKey: ['company-files', variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ['file-companies', variables.fileId] });
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

  // Remove company from a file/list
  const removeCompanyFromFile = useMutation({
    mutationFn: async ({ companyId, fileId }: { companyId: string; fileId: string }) => {
      const { error } = await supabase
        .from('company_workspace_files')
        .delete()
        .eq('company_id', companyId)
        .eq('file_id', fileId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({ title: "Removed from List", description: "Company has been removed from the list." });
      queryClient.invalidateQueries({ queryKey: ['company-files', variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ['file-companies', variables.fileId] });
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

  // Add company to multiple files at once
  const addCompanyToMultipleFiles = useMutation({
    mutationFn: async ({ companyId, fileIds }: { companyId: string; fileIds: string[] }) => {
      const inserts = fileIds.map(fileId => ({
        company_id: companyId,
        file_id: fileId,
        added_by: user?.id
      }));
      
      const { data, error } = await supabase
        .from('company_workspace_files')
        .upsert(inserts, { onConflict: 'company_id,file_id' })
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast({ 
        title: "Added to Lists", 
        description: `Company added to ${variables.fileIds.length} list(s).` 
      });
      queryClient.invalidateQueries({ queryKey: ['company-files', variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ['file-companies'] });
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
    addCompanyToFile,
    removeCompanyFromFile,
    addCompanyToMultipleFiles
  };
};