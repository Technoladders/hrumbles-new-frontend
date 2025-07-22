import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Candidate } from '@/components/MagicLinkView/types';
import { supabase } from "@/integrations/supabase/client";

// Helper to sanitize mobile numbers, returning only the last 10 digits
const sanitizeMobile = (phone: string | null | undefined): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, '').slice(-10);
};

export const useUanLookup = (
  candidate: Candidate | null,
  organizationId: string | null,
  userId: string | null,
  onSaveResult: (data: any, method: 'mobile' | 'pan', value: string) => Promise<void>
) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uanData, setUanData] = useState<any | null>(null);
  const [lookupMethod, setLookupMethod] = useState<'mobile' | 'pan'>('mobile');
  const [lookupValue, setLookupValue] = useState('');
  const [isQueued, setIsQueued] = useState(false); // New state to track if a job is in the queue

  // Effect to load initial data, check queue, and listen for real-time updates
  useEffect(() => {
    if (!candidate?.id) {
      setUanData(null);
      setLookupValue('');
      return;
    }

    // Auto-fill the lookup value with the candidate's phone number initially
    setLookupValue(candidate.phone || '');

    const fetchInitialState = async () => {
      setIsLoading(true);

      // 1. Check if a job for this candidate is already in the queue
      const { data: queueData, error: queueError } = await supabase
        .from('uan_basic_lookup_queue')
        .select('id')
        .eq('candidate_id', candidate.id)
        .eq('status', 'pending')
        .limit(1)
        .single();
      
      if (queueData) {
        setIsQueued(true); // A job is pending!
      }

      // 2. Fetch the latest completed lookup result
      const { data, error } = await supabase
        .from('uanlookups')
        .select('response_data, lookup_value, lookup_type')
        .eq('candidate_id', candidate.id)
        .in('lookup_type', ['mobile', 'pan'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (data) {
        setUanData(data.response_data);
        setLookupValue(data.lookup_value || candidate.phone || ''); // Prioritize last lookup value
        setLookupMethod(data.lookup_type as 'mobile' | 'pan' || 'mobile');
      }
      setIsLoading(false);
    };

    fetchInitialState();

    // 3. Set up Realtime subscription
    const channel = supabase.channel(`uan-basic-lookups:${candidate.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'uanlookups', filter: `candidate_id=eq.${candidate.id}` },
        (payload) => {
          const newRecord = payload.new as { response_data: any; lookup_type: string; lookup_value: string };
          if (newRecord?.response_data && ['mobile', 'pan'].includes(newRecord.lookup_type)) {
            setIsQueued(false); // A result came in, so it's no longer queued
            setUanData(newRecord.response_data);
            setIsLoading(false);
            if (newRecord.response_data.status === 1) {
              onSaveResult(newRecord.response_data, newRecord.lookup_type as 'mobile' | 'pan', newRecord.lookup_value);
            }
          }
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [candidate?.id, candidate?.phone, toast, onSaveResult, organizationId]);

  const handleLookup = useCallback(async () => {
   if (!candidate?.id || !organizationId || !userId) {
      toast({ title: 'Error', description: 'Missing critical IDs.', variant: 'destructive' });
      return;
    }

    const sanitizedValue = lookupMethod === 'mobile' ? sanitizeMobile(lookupValue) : lookupValue;
    if (lookupMethod === 'mobile' && sanitizedValue.length !== 10) {
      toast({ title: 'Invalid Mobile Number', description: 'Please enter a valid 10-digit mobile number.', variant: 'destructive' });
      return;
    }
    // New validation for PAN lookup
    if (lookupMethod === 'pan' && !candidate.phone) {
        toast({ title: 'Missing Mobile Number', description: 'The candidate\'s mobile number is required to perform a PAN lookup.', variant: 'destructive' });
        return;
    }

    setIsLoading(true);
    setUanData(null);

    // Check if this number has previously failed with "No Record Found"
    const { data: previousFailure, error: failureCheckError } = await supabase
      .from('uanlookups')
      .select('id')
      .eq('lookup_type', lookupMethod)
      .eq('lookup_value', sanitizedValue)
      .eq('status', 9) // Status 9 is "No Record Found"
      .limit(1)
      .single();

    if (previousFailure) {
      toast({ title: 'Already Checked', description: 'This number has been checked before and no UAN was found.', variant: 'warning' });
      setUanData({ status: 9, msg: 'No Record Found (previously checked)' });
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('uan-lookup', {
        body: { lookupMethod, lookupValue: sanitizedValue, candidateId: candidate.id, organizationId, userId, candidateMobile: lookupMethod === 'pan' ? sanitizeMobile(candidate.phone) : null, },
      });

      if (error) throw error;
      
      if (data.status === 'pending') {
        setIsQueued(true);
        toast({ title: 'UAN Lookup In Progress', description: data.message, variant: 'default' });
      } else if (data.status === 'completed') {
        setUanData(data.data);
       
        setIsLoading(false);
      }
    } catch (error: any) {
      // ... error handling ...
      setIsLoading(false);
    }
  }, [lookupValue, lookupMethod, candidate, organizationId, userId, onSaveResult, toast]);


  // Combine isLoading and isQueued for the UI
  const isProcessing = isLoading || isQueued;

  return {
    isLoading: isProcessing, // Use this for the UI
    uanData,
    lookupMethod,
    setLookupMethod,
    lookupValue,
    setLookupValue,
    handleLookup,
    isQueued, // Expose this for custom UI messages
  };
};