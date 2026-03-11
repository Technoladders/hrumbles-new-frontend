// src/hooks/sales/useManageWorkspaces.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@chakra-ui/react';

interface WorkspacePayload {
  id?: string;
  name: string;
  type: 'people' | 'companies';
  organization_id?: string;
  created_by?: string;
}

interface FilePayload {
  id?: string;
  name: string;
  type: 'people' | 'companies';
  workspace_id: string;
  organization_id?: string;
  created_by?: string;
}

export const useManageWorkspaces = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    queryClient.invalidateQueries({ queryKey: ['workspaceFiles'] });
  };

  const handleError = (error: any, title: string) => toast({
    title, description: error.message, status: 'error', duration: 5000, isClosable: true,
  });

  const handleSuccess = (title: string) => {
    toast({ title, status: 'success', duration: 3000, isClosable: true });
    invalidate();
  };

  // ── Workspace ────────────────────────────────────────────────────────────

  const addWorkspace = useMutation({
    mutationFn: async (payload: WorkspacePayload) => {
      const { data, error } = await supabase
        .from('workspaces')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => handleSuccess('Folder created'),
    onError: (e) => handleError(e, 'Failed to create folder'),
  });

  const updateWorkspace = useMutation({
    mutationFn: async (payload: Pick<WorkspacePayload, 'id' | 'name'>) => {
      const { error } = await supabase
        .from('workspaces')
        .update({ name: payload.name })
        .eq('id', payload.id!);
      if (error) throw error;
    },
    onSuccess: () => handleSuccess('Folder renamed'),
    onError: (e) => handleError(e, 'Failed to rename folder'),
  });

  const deleteWorkspace = useMutation({
    mutationFn: async (workspaceId: string) => {
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId);
      if (error) throw error;
    },
    onSuccess: () => handleSuccess('Folder deleted'),
    onError: (e) => handleError(e, 'Failed to delete folder'),
  });

  // ── Files ─────────────────────────────────────────────────────────────────

  const addFile = useMutation({
    mutationFn: async (payload: FilePayload) => {
      const { data, error } = await supabase
        .from('workspace_files')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => handleSuccess('List created'),
    onError: (e) => handleError(e, 'Failed to create list'),
  });

  const updateFile = useMutation({
    mutationFn: async (payload: Pick<FilePayload, 'id' | 'name'> & { workspace_id: string }) => {
      const { error } = await supabase
        .from('workspace_files')
        .update({ name: payload.name })
        .eq('id', payload.id!);
      if (error) throw error;
    },
    onSuccess: () => handleSuccess('List renamed'),
    onError: (e) => handleError(e, 'Failed to rename list'),
  });

  const deleteFile = useMutation({
    mutationFn: async (fileId: string) => {
      const { error } = await supabase
        .from('workspace_files')
        .delete()
        .eq('id', fileId);
      if (error) throw error;
    },
    onSuccess: () => handleSuccess('List deleted'),
    onError: (e) => handleError(e, 'Failed to delete list'),
  });

  return { addWorkspace, updateWorkspace, deleteWorkspace, addFile, updateFile, deleteFile };
};