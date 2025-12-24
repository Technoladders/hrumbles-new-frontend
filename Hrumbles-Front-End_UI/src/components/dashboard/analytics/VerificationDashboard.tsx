import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import VerificationAnalytics from './VerificationAnalytics';
import { CreditTransaction } from './analyticsUtils';
import { Loader2 } from 'lucide-react';

interface VerificationDashboardProps {
  organizationId: string;
}

const VerificationDashboard: React.FC<VerificationDashboardProps> = ({ organizationId }) => {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, [organizationId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  {/* CHANGED: Removed Tabs, replaced with flat layout for Goal 3 */}
  return (
    <div className="space-y-8 pb-12">
      <VerificationAnalytics organizationId={organizationId} />
    </div>
  );
};

export default VerificationDashboard;