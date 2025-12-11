// src/components/layout/CreditBalanceDisplay.tsx

import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';
import { Coins, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export const CreditBalanceDisplay = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  // 1. Fetch Current Balance & Config
  const { data: orgData, isLoading: isOrgLoading } = useQuery({
    queryKey: ['org-credit-balance', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_organizations')
        .select('credit_balance, verification_check')
        .eq('id', organizationId)
        .single();
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000, 
    enabled: !!organizationId,
  });

  // 2. Fetch Last Top-up Transaction (To get the denominator)
  const { data: lastTopupData } = useQuery({
    queryKey: ['org-last-topup', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('balance_after')
        .eq('organization_id', organizationId)
        .eq('transaction_type', 'topup')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(); // Use maybeSingle to avoid error if no topup exists
      
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // 3. Fetch Pricing for the active provider
  const { data: pricingList } = useQuery({
    queryKey: ['verification-pricing', organizationId, orgData?.verification_check],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('verification_pricing')
        .select('verification_type, price')
        .eq('organization_id', organizationId)
        .eq('source', orgData?.verification_check || 'truthscreen');
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId && !!orgData?.verification_check
  });

  if (isOrgLoading || !orgData) return null;

  const currentBalance = Number(orgData.credit_balance);
  // If no topup found, assume current balance is the total (or default to current)
  const totalLimit = lastTopupData ? Number(lastTopupData.balance_after) : currentBalance; 
  
  const isLow = currentBalance < 50;

  // Helper to format type names
  const formatType = (type: string) => type.replace(/_/g, ' ').replace('gl', '').replace('uan', 'UAN').trim();

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isLow ? 'bg-red-50 border-red-200 text-red-700' : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'}`}>
            <Coins size={16} />
            <span className="font-bold text-sm">
                {currentBalance.toFixed(0)} / {totalLimit.toFixed(0)} Credits
            </span>
            {isLow && <AlertCircle size={14} className="text-red-500" />}
          </div>
        </TooltipTrigger>
        <TooltipContent className="w-80 p-0" side="bottom" align="end">
            <div className="p-3 bg-white text-black border rounded shadow-lg">
                <h4 className="font-semibold text-sm mb-1 flex justify-between items-center">
                    Credit Cost per Request
                </h4>
                <div className="text-xs text-gray-500 mb-3">
                    Number of credits needed to perform verification:
                </div>
                
                <div className="space-y-2">
                    {pricingList && pricingList.length > 0 ? (
                        pricingList.map((item: any) => {
                            const possibleChecks = Math.floor(currentBalance / Number(item.price));
                            return (
                                <div key={item.verification_type} className="flex justify-between items-center text-xs">
                                    <span className="capitalize text-gray-700">{formatType(item.verification_type)}</span>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-[10px] h-5 px-1 bg-gray-100 text-gray-600">
                                            {Number(item.price).toFixed(0)} Credits
                                        </Badge>
                                        {/* <span className={`font-mono font-bold ${possibleChecks === 0 ? 'text-red-500' : 'text-green-600'}`}>
                                            x {possibleChecks}
                                        </span> */}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-xs text-gray-400 italic">No pricing configured.</p>
                    )}
                </div>
                {isLow && (
                    <>
                        <Separator className="my-2" />
                        <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                            <AlertCircle size={12} /> Low credits. Please recharge.
                        </p>
                    </>
                )}
            </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};