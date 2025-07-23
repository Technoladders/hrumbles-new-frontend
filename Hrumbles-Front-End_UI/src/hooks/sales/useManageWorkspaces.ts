import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@chakra-ui/react'; // Use Chakra's toast
import { useSelector } from 'react-redux';

interface AddWorkspacePayload {
  name: string;
  organization_id: string;
  created_by: string;
}

interface AddFilePayload {
  name: string;
  workspace_id: string;
  organization_id: string;
  created_by: string;
}

export const useManageWorkspaces = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  // --- MUTATION TO ADD A NEW WORKSPACE ---
  const addWorkspace = useMutation({
    mutationFn: async (payload: AddWorkspacePayload) => {
      const { data, error } = await supabase.from('workspaces').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Workspace Created',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      // This is key: it tells React Query to refetch the list of workspaces.
      queryClient.invalidateQueries({ queryKey: ['workspaces', organization_id] });
    },
    onError: (error: any) => {
        toast({
            title: 'Failed to create workspace',
            description: error.message,
            status: 'error',
            duration: 5000,
            isClosable: true,
        });
    }
  });

  // --- MUTATION TO ADD A NEW FILE TO A WORKSPACE ---
  const addFile = useMutation({
    mutationFn: async (payload: AddFilePayload) => {
      const { data, error } = await supabase.from('workspace_files').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
        toast({
            title: 'File Created',
            status: 'success',
            duration: 3000,
            isClosable: true,
        });
        // This refetches the list of files for the specific workspace that was just updated.
        queryClient.invalidateQueries({ queryKey: ['workspaceFiles', variables.workspace_id] });
    },
    onError: (error: any) => {
        toast({
            title: 'Failed to create file',
            description: error.message,
            status: 'error',
            duration: 5000,
            isClosable: true,
        });
    }
  });

  return { addWorkspace, addFile };
};