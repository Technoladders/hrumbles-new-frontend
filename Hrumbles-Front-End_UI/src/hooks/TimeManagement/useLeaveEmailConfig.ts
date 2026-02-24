import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';

export function useLeaveEmailConfig() {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [defaultRecipients, setDefaultRecipients] = useState<string[]>([]);
  const [isConfigActive, setIsConfigActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;

    const fetchConfig = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('hr_email_configurations')
          .select('recipients, is_active')
          .eq('organization_id', organizationId)
          .eq('report_type', 'leave_request_notify')
          .maybeSingle();
        
        if (!error && data) {
          setDefaultRecipients(data.recipients || []);
          setIsConfigActive(data.is_active);
        }
      } catch (err) {
        console.error("Failed to fetch leave email config", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [organizationId]);

  return { defaultRecipients, isConfigActive, isLoading };
}