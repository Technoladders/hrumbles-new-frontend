import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
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
  results: { [key: string]: any | null };
}

const sanitizeMobile = (phone: string): string => {
  if (!phone) return '';
  // Removes all non-digit characters and returns the last 10 digits
  return phone.replace(/\D/g, '').slice(-10);
};

export const useBgvVerifications = (candidate: Candidate) => {
  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const [state, setState] = useState<BGVState>({
    inputs: { 
      mobile: candidate?.phone || '', 
      pan: candidate?.metadata?.pan || '', // <-- INITIALIZE PAN HERE
      uan: candidate?.metadata?.uan || ''
    },
    loading: {},
    results: {},
  });

  // Fetch previous results on component load
  useEffect(() => {
    const fetchPreviousResults = async () => {
      const { data, error } = await supabase
        .from('uanlookups')
        .select('lookup_type, response_data')
        .eq('candidate_id', candidate.id)
        .in('lookup_type', [
            'mobile_to_uan', 
            'pan_to_uan', 
            'uan_full_history', 
            'latest_employment_mobile',
            'latest_passbook_mobile',
            'latest_employment_uan'
        ]);
      
      if (data) {
        const prevResults: { [key: string]: any } = {};
        for (const res of data) {
          prevResults[res.lookup_type] = { status: 'completed', data: res.response_data };
        }
        setState(s => ({ ...s, results: prevResults }));
      }
    };
    fetchPreviousResults();
  }, [candidate.id]);

  const handleInputChange = (type: keyof BGVState['inputs'], value: string) => {
    setState(s => ({ ...s, inputs: { ...s.inputs, [type]: value } }));
  };

 const handleVerify = useCallback(async (verificationType: keyof BGVState['inputs']) => {
    setState(s => ({ ...s, loading: { ...s.loading, [verificationType]: true } }));

    try {
      // --- KEY CHANGE: Determine which Edge Function to call ---
      const isGridlinesCheck = [
          'latest_employment_mobile', 
          'latest_passbook_mobile',
          'latest_employment_uan'
      ].includes(verificationType);
      const functionName = isGridlinesCheck ? 'run-gridlines-check' : 'run-bgv-check';
      
      const payload = {
        candidate,
        organizationId,
        userId: user.id,
        mobile: sanitizeMobile(state.inputs.mobile),
        pan: state.inputs.pan,
        uan: state.inputs.uan,
      };

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { verificationType, payload },
      });

      if (error) throw error;
      
     setState(s => ({ ...s, results: { ...s.results, [verificationType]: data } }));
      if (data.status === 'completed' && (data.data?.status === 1 || data.data?.data?.code === '1014' || data.data?.data?.code === '1022')) {
        toast.success(`${verificationType.replace(/_/g, ' ')} verification successful!`);
      } else if (data.status === 'pending') {
        toast.info(data.message);
      } else {
        // Handle cases where the function returns 200 but the API result is a known failure (e.g., "No records found")
        const errorMessage = data.data?.data?.message || data.data?.msg || "Verification completed with no results.";
        toast.warning("Verification Result", { description: errorMessage });
      }

    } catch (err: any) {
      // --- THIS IS THE NEW AND IMPROVED ERROR HANDLING BLOCK ---
      
      let description = "An unknown error occurred. Please check the console."; // Default message

      try {
        // The Supabase client wraps the raw error response in err.context
        const errorJson = await err.context.json();
        const rawError = errorJson.error || err.message;
        
        // Start with the raw error as the fallback
        description = rawError;

        // Use a regular expression to find the JSON object string inside the raw error message
        const jsonMatch = rawError.match(/{[\s\S]*}/);

        if (jsonMatch) {
          // If a JSON string is found, try to parse it
          const innerJson = JSON.parse(jsonMatch[0]);
          
          // Traverse the nested structure to find the user-friendly message
          if (innerJson.error && typeof innerJson.error.message === 'string') {
            description = innerJson.error.message;
          } else if (typeof innerJson.message === 'string') {
            description = innerJson.message;
          }
        }
      } catch (parseError) {
        // If anything fails during parsing, we fall back to the generic message
        description = err.message || "Edge function failed with a non-JSON error response.";
      }
      
      toast.error("Verification Failed", { description });
      
    } finally {
      setState(s => ({ ...s, loading: { ...s.loading, [verificationType]: false } }));
    }
  }, [state.inputs, candidate, organizationId, user?.id]);

  return { state, handleInputChange, handleVerify };
};