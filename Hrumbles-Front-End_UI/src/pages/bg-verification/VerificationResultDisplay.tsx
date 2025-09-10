import { Card, CardContent } from '@/components/ui/card';
import { User, Briefcase, XCircle, AlertTriangle } from 'lucide-react';
import { UanBasicResult } from './results/UanBasicResult';
import { UanHistoryResult } from './results/UanHistoryResult';
import { LatestEmploymentResult } from './results/LatestEmploymentResult';
import { isVerificationSuccessful } from '@/components/jobs/ai/utils/bgvUtils';
import { LatestPassbookResult } from './results/LatestPassbookResult';
import { UanHistoryResultGridlines } from './results/UanHistoryResultGridlines';
import { Candidate } from '@/lib/types';

interface Props {
  resultData: any[];
  verificationType: string;
  candidate: Candidate;
}

export const VerificationResultDisplay = ({ resultData, verificationType, candidate }: Props) => {

  console.log("resultData", resultData)
  if (!resultData || resultData.length === 0) return null;

  const renderResultComponent = (resultItem: any, index: number) => {
    // Check for success on each individual item
    if (isVerificationSuccessful(resultItem.data, verificationType)) {
      switch (verificationType) {
        case 'mobile_to_uan':
        case 'pan_to_uan':
          return <UanBasicResult key={index} result={resultItem.data} meta={resultItem.meta} candidate={candidate} />;
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
    return (
        <Card key={index} className="border-red-200 shadow-sm bg-red-50">
            <CardContent className="p-4 flex items-center gap-2 text-sm font-medium text-red-600">
                <XCircle size={16} />
                {message}
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