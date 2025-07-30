import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@chakra-ui/react';

// --- Interfaces for Payloads ---
interface WorkspacePayload {
  id?: string;
  name: string;
  organization_id?: string;
  created_by?: string;
}

interface FilePayload {
  id?: string;
  name: string;
  type: 'people' | 'companies'; // Added type
  workspace_id: string;
  organization_id?: string;
  created_by?: string;
}

export const useManageWorkspaces = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

    const handleError = (error: any, title: string) => {
        toast({
            title,
            description: error.message,
            status: 'error',
            duration: 5000,
            isClosable: true,
        });
    };
    
    const handleSuccess = (title: string) => {
        toast({
            title,
            status: 'success',
            duration: 3000,
            isClosable: true,
        });
        queryClient.invalidateQueries({ queryKey: ['workspaces'] });
        queryClient.invalidateQueries({ queryKey: ['workspaceFiles'] });
    };

    // --- Workspace Mutations ---
    const addWorkspace = useMutation({
        mutationFn: async (payload: WorkspacePayload) => {
            const { data, error } = await supabase.from('workspaces').insert(payload).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => handleSuccess('Workspace Created'),
        onError: (e) => handleError(e, 'Failed to create workspace'),
    });

    const updateWorkspace = useMutation({
        mutationFn: async (payload: WorkspacePayload) => {
            const { error } = await supabase.from('workspaces').update({ name: payload.name }).eq('id', payload.id);
            if (error) throw error;
        },
        onSuccess: () => handleSuccess('Workspace Updated'),
        onError: (e) => handleError(e, 'Failed to update workspace'),
    });

    const deleteWorkspace = useMutation({
        mutationFn: async (workspaceId: string) => {
            const { error } = await supabase.from('workspaces').delete().eq('id', workspaceId);
            if (error) throw error;
        },
        onSuccess: () => handleSuccess('Workspace Deleted'),
        onError: (e) => handleError(e, 'Failed to delete workspace'),
    });

    // --- File Mutations ---
    const addFile = useMutation({
        mutationFn: async (payload: FilePayload) => {
            const { data, error } = await supabase.from('workspace_files').insert(payload).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => handleSuccess('File Created'),
        onError: (e) => handleError(e, 'Failed to create file'),
    });
    
    const updateFile = useMutation({
        mutationFn: async (payload: Omit<FilePayload, 'type'>) => { // Type is not editable
            const { error } = await supabase.from('workspace_files').update({ name: payload.name }).eq('id', payload.id);
            if (error) throw error;
        },
        onSuccess: () => handleSuccess('File Updated'),
        onError: (e) => handleError(e, 'Failed to update file'),
    });

    const deleteFile = useMutation({
        mutationFn: async (fileId: string) => {
            const { error } = await supabase.from('workspace_files').delete().eq('id', fileId);
            if (error) throw error;
        },
        onSuccess: () => handleSuccess('File Deleted'),
        onError: (e) => handleError(e, 'Failed to delete file'),
    });

    return { addWorkspace, updateWorkspace, deleteWorkspace, addFile, updateFile, deleteFile };
};