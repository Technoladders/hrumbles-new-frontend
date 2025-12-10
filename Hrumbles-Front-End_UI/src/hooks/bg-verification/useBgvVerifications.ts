import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Candidate } from '@/lib/types';

// --- KEY CHANGE: Add 'pan' to the state definition ---
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

  // --- NEW: Fetch Organization Verification Configuration ---
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

  const [state, setState] = useState<BGVState>({
    inputs: { 
      mobile: candidate?.phone || '', 
      pan: candidate?.metadata?.pan || '', // <-- INITIALIZE PAN HERE
      uan: candidate?.metadata?.uan || ''
    },
    loading: {},
    results: {},
  });

  // --- CHANGE 1: The fetching logic is extracted into a reusable useCallback function. ---
  const fetchPreviousResults = useCallback(async () => {
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

       console.log("Fetched raw data from Supabase:", data);
    
    if (data) {
      // --- KEY CHANGE: Group results by lookup_type into arrays ---
      const groupedResults: { [key: string]: any[] } = {};
      for (const res of data) {
        if (!groupedResults[res.lookup_type]) {
          groupedResults[res.lookup_type] = []; // Initialize array if it doesn't exist
        }
        // Push the full result object into the array
        groupedResults[res.lookup_type].push({
          status: 'completed',
          data: res.response_data,
          meta: { // Add useful metadata for display
            timestamp: res.created_at,
            inputValue: res.lookup_value
          }
        });
      }

        console.log("Grouped results to be set in state:", groupedResults);
      setState(s => ({ ...s, results: groupedResults }));
    }
  }, [candidate?.id]);

    // --- CHANGE 2: The useEffect now simply calls the function above. ---
  useEffect(() => {
    fetchPreviousResults();
  }, [fetchPreviousResults]); 

  const handleInputChange = (type: keyof BGVState['inputs'], value: string) => {
    setState(s => ({ ...s, inputs: { ...s.inputs, [type]: value } }));
  };

 const handleVerify = useCallback(async (verificationType: keyof BGVState['inputs']) => {
    setState(s => ({ ...s, loading: { ...s.loading, [verificationType]: true } }));

    try {
      // --- KEY CHANGE: Determine which Edge Function to call ---
       const preferredProvider = orgConfig?.verification_check || 'truthscreen';
      
      // 2. Decide function name based on provider
      let functionName = preferredProvider === 'gridlines' ? 'run-gridlines-check' : 'run-bgv-check';
      
      const payload = {
        candidate,
        organizationId,
        userId: user.id,
        mobile: sanitizeMobile(state.inputs.mobile),
        pan: state.inputs.pan,
        uan: state.inputs.uan,
      };

       console.log(`Verifying using provider: ${preferredProvider} (Function: ${functionName})`);

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { verificationType, payload },
      });

      if (error) throw error;

            await fetchPreviousResults();
      
      if (data.status === 'completed' && (data.data?.status === 1 || data.data?.data?.code === '1014' || data.data?.data?.code === '1022')) {
        toast.success(`${verificationType.replace(/_/g, ' ')} verification successful!`);
      } else if (data.status === 'pending') {
        toast.info(data.message);
      } else {
        const errorMessage = data.data?.data?.message || data.data?.msg || "Verification completed with no results.";
        toast.warning("Verification Result", { description: errorMessage });
      }

    } catch (err: any) {

      // --- THIS IS THE NEW AND IMPROVED ERROR HANDLING BLOCK ---
      
     let description = "An unknown error occurred. Please try after sometime.";

      // --- FIXED ERROR PARSING LOGIC ---
      try {
        if (err && typeof err.context?.json === 'function') {
          // 1. Try to parse the JSON response body from the Edge Function
          const errorJson = await err.context.json();
          
          console.log("Parsed Error JSON:", errorJson); // Debug log

          // 2. Check for 'message' (standard) or 'error' (legacy) fields
          if (errorJson.message) {
            description = errorJson.message;
          } else if (errorJson.error && typeof errorJson.error === 'string') {
            description = errorJson.error;
          } else if (errorJson.error && errorJson.error.message) {
            description = errorJson.error.message;
          }
        } else if (err.message) {
          // Fallback if no JSON context is available
          description = err.message;
        }
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        description = err.message || "Edge function failed.";
      }
      
      toast.error("Verification Failed", { description });
      
    } finally {
     setState(s => ({ ...s, loading: { ...s.loading, [verificationType]: false } }));
    }
  }, [state.inputs, candidate, organizationId, user?.id, fetchPreviousResults, orgConfig]);

  return { state, handleInputChange, handleVerify };
};