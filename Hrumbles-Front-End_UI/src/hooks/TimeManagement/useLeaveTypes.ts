import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LeaveType } from '@/types/leave-types';
import { toast } from '@/hooks/use-toast';
import { getAuthDataFromLocalStorage } from '@/utils/localstorage';

export const useLeaveTypes = () => {
  const queryClient = useQueryClient();
  const [isAddPolicyDialogOpen, setIsAddPolicyDialogOpen] = useState(false);
  
  const authData = getAuthDataFromLocalStorage();
  // Safe check for auth data
  const organization_id = authData?.organization_id;

  // Fetch all leave types
  const { data: leaveTypes, isLoading } = useQuery({
    queryKey: ['leaveTypes'],
    queryFn: async () => {
      if (!organization_id) return [];
      
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .eq('organization_id', organization_id) // Filter by org!
        .order('name');
      
      if (error) throw error;
      return (data as any) as LeaveType[];
    },
    enabled: !!organization_id
  });

  // Add a new leave type (With RPC Trigger)
  const addLeaveTypeMutation = useMutation({
    mutationFn: async (newLeaveType: any) => {
      if (!organization_id) throw new Error("Organization ID missing");

      // 1. Insert the Leave Type
      const payload = {
        ...newLeaveType,
        organization_id, 
      };
      
      const { data, error } = await supabase
        .from('leave_types')
        .insert([payload])
        .select()
        .single();
      
      if (error) throw error;
      
      // 2. Call RPC to initialize balances for all employees efficiently
      const { error: rpcError } = await supabase
        .rpc('initialize_new_leave_type_for_all', {
          new_leave_type_id: data.id,
          target_org_id: organization_id
        });

      if (rpcError) {
        console.error("Failed to initialize balances:", rpcError);
        // We don't throw here to avoid rolling back the UI, but we warn the user
        toast({
          title: "Warning",
          description: "Leave type created, but automatic balance allocation failed. Please contact support.",
          variant: "destructive",
        });
      }
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Leave policy created and allocated to eligible employees.",
      });
      queryClient.invalidateQueries({ queryKey: ['leaveTypes'] });
      setIsAddPolicyDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add leave type: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update a leave type
  const updateLeaveTypeMutation = useMutation({
    mutationFn: async (leaveType: Partial<LeaveType> & { id: string }) => {
      const { id, ...updates } = leaveType;
      const { data, error } = await supabase
        .from('leave_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Leave policy updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['leaveTypes'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update leave type: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete a leave type
  const deleteLeaveTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leave_types')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Leave type has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['leaveTypes'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete leave type: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  return {
    leaveTypes: leaveTypes || [],
    isLoading,
    addLeaveType: addLeaveTypeMutation.mutate,
    updateLeaveType: updateLeaveTypeMutation.mutate,
    deleteLeaveType: deleteLeaveTypeMutation.mutate,
    isAddPolicyDialogOpen,
    setIsAddPolicyDialogOpen
  };
};