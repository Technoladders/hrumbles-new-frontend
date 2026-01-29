// src/hooks/sales/useSavedFilters.ts
// Hook for managing saved filter presets

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { Table } from '@tanstack/react-table';

interface SavedFilter {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  description?: string;
  filter_config: any; // The actual filter state from TanStack Table
  is_public: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface SaveFilterPayload {
  name: string;
  description?: string;
  filterConfig: any;
  isPublic: boolean;
  isDefault: boolean;
}

export const useSavedFilters = () => {
  const queryClient = useQueryClient();
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const currentUser = useSelector((state: any) => state.auth.user);
  const userId = currentUser?.id;

  // Fetch saved filters
  const { data: savedFilters, isLoading } = useQuery<SavedFilter[]>({
    queryKey: ['savedContactFilters', organization_id, userId],
    queryFn: async () => {
      if (!organization_id || !userId) return [];

      // Get filters created by user OR public filters from team
      const { data, error } = await supabase
        .from('saved_contact_filters')
        .select('*')
        .eq('organization_id', organization_id)
        .or(`created_by.eq.${userId},is_public.eq.true`)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!organization_id && !!userId,
  });

  // Save filter mutation
  const saveFilterMutation = useMutation({
    mutationFn: async (payload: SaveFilterPayload) => {
      if (!organization_id || !userId) {
        throw new Error('Organization or user not found');
      }

      // If setting as default, unset other defaults first
      if (payload.isDefault) {
        await supabase
          .from('saved_contact_filters')
          .update({ is_default: false })
          .eq('organization_id', organization_id)
          .eq('created_by', userId);
      }

      const { data, error } = await supabase
        .from('saved_contact_filters')
        .insert({
          organization_id,
          created_by: userId,
          name: payload.name,
          description: payload.description,
          filter_config: payload.filterConfig,
          is_public: payload.isPublic,
          is_default: payload.isDefault,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedContactFilters'] });
    },
  });

  // Delete filter mutation
  const deleteFilterMutation = useMutation({
    mutationFn: async (filterId: string) => {
      const { error } = await supabase
        .from('saved_contact_filters')
        .delete()
        .eq('id', filterId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedContactFilters'] });
    },
  });

  // Load filter function (applies to table)
  const loadFilter = (filterId: string, table: Table<any>) => {
    const filter = savedFilters?.find(f => f.id === filterId);
    if (!filter) return;

    // Clear existing filters
    table.resetColumnFilters();

    // Apply saved filters
    if (Array.isArray(filter.filter_config)) {
      filter.filter_config.forEach((filterItem: any) => {
        const column = table.getAllColumns().find(c => c.id === filterItem.id);
        if (column) {
          column.setFilterValue(filterItem.value);
        }
      });
    }
  };

  // Get default filter (auto-apply on page load)
  const getDefaultFilter = () => {
    return savedFilters?.find(f => f.is_default);
  };

  // Auto-apply default filter
  const applyDefaultFilter = (table: Table<any>) => {
    const defaultFilter = getDefaultFilter();
    if (defaultFilter) {
      loadFilter(defaultFilter.id, table);
    }
  };

  return {
    savedFilters,
    isLoading,
    saveFilter: saveFilterMutation.mutateAsync,
    isSaving: saveFilterMutation.isPending,
    deleteFilter: deleteFilterMutation.mutateAsync,
    isDeleting: deleteFilterMutation.isPending,
    loadFilter,
    getDefaultFilter,
    applyDefaultFilter,
  };
};