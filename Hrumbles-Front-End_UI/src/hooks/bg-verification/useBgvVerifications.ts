import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Candidate } from '@/lib/types';

export interface BGVState {
  inputs: {
    mobile: string;
    pan: string;
    uan: string;
    latest_employment_mobile?: string;
    latest_passbook_mobile?: string;
    latest_employment_uan?: string;
  };
  loading: { [key: string]: boolean };
  results: { [key: string]: any[] | null };
}

const sanitizeMobile = (phone: string): string => {
  if (!phone) return '';
  // Removes all non-digit characters and returns the last 10 digits
  return phone.replace(/\D/g, '').slice(-10);
};

export const useBgvVerifications = (candidate: Candidate) => {
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const queryClient = useQueryClient(); // Used to sync data across components

  // --- 1. Fetch Organization Verification Configuration ---
  const { data: orgConfig } = useQuery({
    queryKey: ['org-verification-config', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_organizations')
        .select('verification_check')
        .eq('id', organizationId)
        .single();
      
      if (error) {
        console.error("Error fetching org config:", error);
        return { verification_check: 'truthscreen' }; // Default fallback
      }
      return data;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });

  // --- 2. Local UI State (Inputs & Loading) ---
  // We keep inputs local because typing shouldn't trigger global re-renders
  const [uiState, setUiState] = useState<{
    inputs: BGVState['inputs'];
    loading: BGVState['loading'];
  }>({
    inputs: { 
      mobile: candidate?.phone || '', 
      pan: candidate?.metadata?.pan || '', 
      uan: candidate?.metadata?.uan || ''
    },
    loading: {},
  });

  // --- 3. Server State (Results) - REPLACES useEffect/fetchPreviousResults ---
  // Using useQuery ensures both the ProfilePage and VerificationSection share the same data.
  const { data: results = {} } = useQuery({
    queryKey: ['bgvResults', candidate?.id],
    queryFn: async () => {
      if (!candidate?.id) return {};

      const { data, error } = await supabase
        .from('uanlookups')
        .select('lookup_type, response_data, created_at, lookup_value')
        .eq('candidate_id', candidate.id)
        .in('lookup_type', [
            'mobile_to_uan', 
            'pan_to_uan', 
            'uan_full_history', 
            'latest_employment_mobile',
            'latest_passbook_mobile',
            'latest_employment_uan',
            'uan_full_history_gl'
        ])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform raw data into the grouped structure required by the UI
      const groupedResults: { [key: string]: any[] } = {};
      if (data) {
        for (const res of data) {
          if (!groupedResults[res.lookup_type]) {
            groupedResults[res.lookup_type] = [];
          }
          groupedResults[res.lookup_type].push({
            status: 'completed',
            data: res.response_data,
            meta: { 
              timestamp: res.created_at,
              inputValue: res.lookup_value
            }
          });
        }
      }
      return groupedResults;
    },
    enabled: !!candidate?.id,
    staleTime: 0, // Always consider stale to ensure invalidation works immediately
  });

  // --- 4. Merge Local and Server State ---
  const state: BGVState = {
    inputs: uiState.inputs,
    loading: uiState.loading,
    results: results, // Now coming from React Query
  };

  const handleInputChange = (type: keyof BGVState['inputs'], value: string) => {
    setUiState(s => ({ ...s, inputs: { ...s.inputs, [type]: value } }));
  };

  const handleVerify = useCallback(async (verificationType: keyof BGVState['inputs']) => {
    setUiState(s => ({ ...s, loading: { ...s.loading, [verificationType]: true } }));

    try {
      const preferredProvider = orgConfig?.verification_check || 'truthscreen';
      let functionName = preferredProvider === 'gridlines' ? 'run-gridlines-check' : 'run-bgv-check';
      
      const payload = {
        candidate,
        organizationId,
        userId: user.id,
        mobile: sanitizeMobile(uiState.inputs.mobile),
        pan: uiState.inputs.pan,
        uan: uiState.inputs.uan,
      };

      console.log(`Verifying using provider: ${preferredProvider} (Function: ${functionName})`);

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { verificationType, payload },
      });

      if (error) throw error;

      // --- KEY CHANGE: Invalidate Query to Update ALL Components Immediately ---
      await queryClient.invalidateQueries({ queryKey: ['bgvResults', candidate.id] });
      
      // Success Messages
      if (data.status === 'completed' && (
          data.data?.status === 1 || 
          data.data?.data?.code === '1014' || 
          data.data?.data?.code === '1022' ||
          data.data?.data?.code === '1013' // Gridlines History Success
      )) {
        toast.success(`${verificationType.replace(/_/g, ' ')} verification successful!`);
      } else if (data.status === 'pending') {
        toast.info(data.message);
      } else {
        const errorMessage = data.data?.data?.message || data.data?.msg || "Verification completed with no results.";
        toast.warning("Verification Result", { description: errorMessage });
      }

    } catch (err: any) {
      let description = "Unable to fetch data at the moment. Please retry after some time.";

      try {
        if (err && typeof err.context?.json === 'function') {
          const errorJson = await err.context.json();
          console.log("Parsed Error JSON:", errorJson); 

          if (errorJson.message) {
            description = errorJson.message;
          } else if (errorJson.error && typeof errorJson.error === 'string') {
            description = errorJson.error;
          } else if (errorJson.error && errorJson.error.message) {
            description = errorJson.error.message;
          }
        } else if (err.message) {
          description = err.message;
        }
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        description = err.message || "Edge function failed.";
      }
      
      toast.error("Verification Failed", { description });
      
    } finally {
     setUiState(s => ({ ...s, loading: { ...s.loading, [verificationType]: false } }));
    }
  }, [uiState.inputs, candidate, organizationId, user?.id, orgConfig, queryClient]); // Added queryClient dependency

  return { state, handleInputChange, handleVerify };
};