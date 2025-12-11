// src/pages/jobs/ai/VerificationResultDisplay.tsx

import { Card, CardContent } from '@/components/ui/card';
import { XCircle } from 'lucide-react';
import { UanBasicResult } from './results/UanBasicResult';
import { UanHistoryResult } from './results/UanHistoryResult';
import { LatestEmploymentResult } from './results/LatestEmploymentResult';
import { isVerificationSuccessful } from '@/components/jobs/ai/utils/bgvUtils';
import { getLookupTypeLabel } from '@/components/jobs/ai/utils/bgv-utils'; // ← Add this line
import { LatestPassbookResult } from './results/LatestPassbookResult';
import { UanHistoryResultGridlines } from './results/UanHistoryResultGridlines';
import { Candidate } from '@/lib/types';

interface Props {
  resultData: any[];
  verificationType: string;       
  candidate: Candidate;
  onNavigateToVerification?: (verificationType: string, prefillData: any) => void;
    hideNavigationButtons?: boolean; 
}

export const VerificationResultDisplay = ({ 
  resultData, 
  verificationType, 
  candidate,
  onNavigateToVerification,
   hideNavigationButtons = false 
}: Props) => {

  console.log("resultData", resultData);
  
  if (!resultData || resultData.length === 0) return null;

  const renderResultComponent = (resultItem: any, index: number) => {
    // Check for success on each individual item
    if (isVerificationSuccessful(resultItem.data, verificationType)) {
      switch (verificationType) {
        case 'mobile_to_uan':
        case 'pan_to_uan':
          return (
            <UanBasicResult 
              key={index} 
              result={resultItem.data} 
              meta={resultItem.meta} 
              candidate={candidate}
              onNavigateToVerification={onNavigateToVerification}
               hideNavigationButtons={hideNavigationButtons}
            />
          );
        case 'uan_full_history':
          return <UanHistoryResult key={index} result={resultItem.data} meta={resultItem.meta} candidate={candidate} />;
        case 'uan_full_history_gl':
          return <UanHistoryResultGridlines key={index} result={resultItem.data} meta={resultItem.meta} candidate={candidate} />;
        case 'latest_employment_mobile':
        case 'latest_employment_uan':
          return <LatestEmploymentResult key={index} result={resultItem.data} meta={resultItem.meta} />;
        case 'latest_passbook_mobile':
          return <LatestPassbookResult key={index} result={resultItem.data} meta={resultItem.meta} candidate={candidate} />;
        default:
          return <pre key={index}>{JSON.stringify(resultItem.data, null, 2)}</pre>;
      }
    }
    
    // Handle non-success states for each item
    const message = resultItem.data?.msg || resultItem.data?.data?.message || 'Verification failed or no data found.';
    
    // Get the lookup value and label - NEW CODE
    const lookupValue = resultItem.meta?.inputValue || '';
    const lookupLabel = getLookupTypeLabel(verificationType); // ← Use the function here
    
    // Build detailed message - NEW CODE
    const detailedMessage = lookupValue 
      ? `No records found for ${lookupLabel}: ${lookupValue}`
      : message;

    return (
      <Card key={index} className="border-red-200 shadow-sm bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <XCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800 mb-1">No Record Found</p>
              <p className="text-sm text-red-700">{detailedMessage}</p>
              {message !== detailedMessage && (
                <p className="text-xs text-red-600 mt-1 italic">{message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {resultData.map(renderResultComponent)}
    </div>
  );
};