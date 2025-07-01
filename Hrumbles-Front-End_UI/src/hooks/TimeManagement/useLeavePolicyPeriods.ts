
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LeavePolicyPeriod } from '@/types/leave-types';
import { toast } from 'sonner';
import { getAuthDataFromLocalStorage } from '@/utils/localstorage';

export const useLeavePolicyPeriods = () => {
  const [leavePeriods, setLeavePeriods] = useState<LeavePolicyPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditPeriodDialogOpen, setIsEditPeriodDialogOpen] = useState(false);
  // Add a default policy period state
  const [policyPeriod, setPolicyPeriod] = useState<LeavePolicyPeriod | null>(null);
const authData = getAuthDataFromLocalStorage();
    if (!authData) {
      throw new Error('Failed to retrieve authentication data');
    }
    const { organization_id, userId } = authData;

  // Load leave policy periods
  const loadLeavePolicyPeriods = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leave_policy_periods')
        .select('*')
        .order('start_month', { ascending: true });

      if (error) throw error;
      setLeavePeriods(data || []);
      // Set first period as default if available
      if (data && data.length > 0) {
        setPolicyPeriod(data[0]);
      }
    } catch (error) {
      console.error('Error loading leave policy periods:', error);
      toast.error('Failed to load leave policy periods');
    } finally {
      setLoading(false);
    }
  };

  // Create a new leave policy period
  const createLeavePolicyPeriod = async (period: Omit<LeavePolicyPeriod, 'id' | 'created_at' | 'updated_at'>) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('leave_policy_periods')
        .insert({
          is_calendar_year: period.is_calendar_year,
          start_month: period.start_month,
          organization_id
        });

      if (error) throw error;
      toast.success('Leave policy period created successfully');
      await loadLeavePolicyPeriods();
      return true;
    } catch (error) {
      console.error('Error creating leave policy period:', error);
      toast.error('Failed to create leave policy period');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update leave policy period
  const updateLeavePolicyPeriod = async (id: string, period: Partial<LeavePolicyPeriod>) => {
    // Ensure start_month exists before inserting
    if (period.start_month === undefined) {
      toast.error('Start month is required');
      return false;
    }
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('leave_policy_periods')
        .update({
          is_calendar_year: period.is_calendar_year,
          start_month: period.start_month
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Leave policy period updated successfully');
      await loadLeavePolicyPeriods();
      return true;
    } catch (error) {
      console.error('Error updating leave policy period:', error);
      toast.error('Failed to update leave policy period');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Added updatePolicyPeriod function for compatibility with LeavePolicies.tsx
  const updatePolicyPeriod = updateLeavePolicyPeriod;

  // Delete leave policy period
  const deleteLeavePolicyPeriod = async (id: string) => {
    try {
      const { error } = await supabase
        .from('leave_policy_periods')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Leave policy period deleted successfully');
      await loadLeavePolicyPeriods();
      return true;
    } catch (error) {
      console.error('Error deleting leave policy period:', error);
      toast.error('Failed to delete leave policy period');
      return false;
    }
  };

  useEffect(() => {
    loadLeavePolicyPeriods();
  }, []);

  return {
    leavePeriods,
    loading,
    isLoading: loading,  // Add isLoading alias for loading
    isSubmitting,
    createLeavePolicyPeriod,
    updateLeavePolicyPeriod,
    updatePolicyPeriod,  // Add alias for updateLeavePolicyPeriod
    deleteLeavePolicyPeriod,
    loadLeavePolicyPeriods,
    policyPeriod,
    isEditPeriodDialogOpen,
    setIsEditPeriodDialogOpen
  };
};
